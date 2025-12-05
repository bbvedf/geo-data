# /home/bbvedf/prog/geo-data/backend/scripts/process_elections.py
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
import os
from pathlib import Path
import sys

def get_db_config():
    """Obtener configuración de base de datos desde .env en raíz del proyecto"""
    env_path = Path(__file__).parent.parent.parent / '.env'
    
    print(f"🔍 Buscando .env en: {env_path}")
    
    if env_path.exists():
        try:
            with open(env_path, 'r') as f:
                env_vars = {}
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#'):
                        if '=' in line:
                            key, value = line.split('=', 1)
                            env_vars[key.strip()] = value.strip()
            print("   ✅ .env cargado")
        except Exception as e:
            print(f"   ⚠️  Error leyendo .env: {e}")
            env_vars = {}
    else:
        print("   ⚠️  No se encontró .env, usando valores por defecto")
        env_vars = {}
    
    return {
        'host': 'localhost',
        'port': 5440,
        'database': env_vars.get('DB_NAME', 'geodata_prod'),
        'user': env_vars.get('DB_USER', 'geodata'),
        'password': env_vars.get('DB_PASSWORD', 'geodata')
    }

def get_excel_path():
    """Obtener ruta al archivo Excel - RUTA FIJA"""
    excel_path = Path('/home/bbvedf/prog/geo-data/backend/data/02_202307_1.xlsx')
    
    if excel_path.exists():
        print(f"📁 Excel encontrado en: {excel_path}")
        return str(excel_path)
    else:
        print(f"❌ No se encontró el Excel en: {excel_path}")
        print("Buscando en otras ubicaciones...")
        
        alternative_paths = [
            Path(__file__).parent / 'data' / '02_202307_1.xlsx',
            Path(__file__).parent.parent / 'data' / '02_202307_1.xlsx',
            Path.cwd() / 'data' / '02_202307_1.xlsx',
        ]
        
        for path in alternative_paths:
            if path.exists():
                print(f"✅ Encontrado en ubicación alternativa: {path}")
                return str(path)
        
        print("\n⚠️  No se encontró el archivo automáticamente.")
        user_path = input("Por favor, ingresa la ruta completa al archivo Excel:\n> ").strip()
        
        if Path(user_path).exists():
            return user_path
        else:
            raise FileNotFoundError(f"Archivo no encontrado: {user_path}")

def process_excel_to_postgres(excel_path, db_config, limit=None):
    """Procesa Excel del Ministerio y carga a PostgreSQL"""
    
    print(f"🎯 Configuración DB: {db_config['host']}:{db_config['port']}/{db_config['database']}")
    
    # 1. Leer Excel (saltar primeras 5 filas, fila 6 son encabezados)
    print("📥 Leyendo Excel...")
    try:
        df = pd.read_excel(
            excel_path, 
            skiprows=5,
            dtype={'Código de Municipio': str}
        )
        print(f"   ✅ Leídas {len(df)} filas del Excel")
    except Exception as e:
        print(f"❌ Error leyendo Excel: {e}")
        return 0, 0
    
    # 2. Limpiar nombres de columnas
    def clean_column_name(col):
        if isinstance(col, str):
            return col.strip().lower().replace(' ', '_').replace('-', '_').replace('.', '')
        elif isinstance(col, (int, float)):
            return f'col_{int(col)}'
        else:
            return str(col)
    
    df.columns = [clean_column_name(col) for col in df.columns]
    print(f"   ✅ Columnas encontradas: {len(df.columns)}")
    print(f"   📋 Primeras columnas: {list(df.columns)[:15]}...")
    
    # 3. Limitar para prueba (opcional)
    if limit:
        df = df.head(limit)
        print(f"   ⚡ Modo prueba: limitando a {limit} registros")
    
    # 4. Crear código INE único (provincia + municipio)
    cod_prov_col = None
    cod_mun_col = None
    for col in df.columns:
        if 'código' in col and 'provincia' in col:
            cod_prov_col = col
        elif 'código' in col and 'municipio' in col:
            cod_mun_col = col
    
    if cod_prov_col and cod_mun_col:
        df['codigo_ine'] = df[cod_prov_col].astype(str).str.zfill(2) + \
                          df[cod_mun_col].astype(str).str.zfill(3)
        print(f"   ✅ Código INE creado usando: {cod_prov_col}, {cod_mun_col}")
    else:
        print("⚠️  No se encontraron columnas de código, usando índice")
        df['codigo_ine'] = df.index.astype(str).str.zfill(5)
    
    # 5. PREPARAR DATOS PARA TABLA MUNICIPIOS
    print("\n🧹 Preparando datos de municipios...")
    municipios_data = []
    
    col_mapping = {
        'nombre_municipio': ['nombre_de_municipio', 'municipio'],
        'nombre_provincia': ['nombre_de_provincia', 'provincia'],
        'nombre_comunidad': ['nombre_de_comunidad', 'comunidad'],
        'poblacion': ['población', 'poblacion', 'habitantes']
    }
    
    for _, row in df.iterrows():
        nombre_municipio = None
        for possible in col_mapping['nombre_municipio']:
            if possible in df.columns:
                nombre_municipio = row[possible]
                break
        
        nombre_provincia = None
        for possible in col_mapping['nombre_provincia']:
            if possible in df.columns:
                nombre_provincia = row[possible]
                break
        
        nombre_comunidad = None
        for possible in col_mapping['nombre_comunidad']:
            if possible in df.columns:
                nombre_comunidad = row[possible]
                break
        
        poblacion = None
        for possible in col_mapping['poblacion']:
            if possible in df.columns and possible in row:
                poblacion_val = row[possible]
                if isinstance(poblacion_val, str):
                    poblacion_val = poblacion_val.replace('.', '')
                poblacion = int(float(poblacion_val)) if pd.notna(poblacion_val) else 0
                break
        
        municipios_data.append({
            'codigo_ine': row['codigo_ine'],
            'nombre_municipio': nombre_municipio or 'Desconocido',
            'nombre_provincia': nombre_provincia or 'Desconocida',
            'nombre_comunidad': nombre_comunidad or 'Desconocida',
            'poblacion': poblacion or 0,
            'lat': None,
            'lon': None
        })
    
    print(f"   ✅ {len(municipios_data)} municipios preparados")
    
    # 6. PREPARAR DATOS PARA TABLA ELECCIONES
    print("\n🗳️ Preparando datos electorales...")
    elecciones_data = []
    
    # Partidos principales (14 como acordamos)
    partidos_principales = [
        'pp', 'psoe', 'vox', 'sumar', 'erc', 
        'jxcat_junts', 'eh_bildu', 'eaj_pnv', 
        'bng', 'cca', 'upn', 'pacma', 'cup_pr', 'fo'
    ]
    
    # Mapear nombres alternativos que puedan aparecer
    partidos_aliases = {
        'jxcat_junts': ['jxcat_junts', 'junts', 'jxcat'],
        'eaj_pnv': ['eaj_pnv', 'pnv'],
        'bng': ['bng', 'bloque_nacionalista_galego'],
        'cca': ['cca', 'coalición_canaria'],
        'upn': ['upn', 'unión_del_pueblo_navarro'],
        'pacma': ['pacma', 'partido_animalista'],
        'cup_pr': ['cup_pr', 'cup'],
        'fo': ['fo', 'frente_obrero']
    }
    
    for idx, row in df.iterrows():
        # Buscar votos para cada partido (con aliases)
        votos_partidos = {}
        
        for partido in partidos_principales:
            votos = 0
            # Intentar con el nombre directo
            if partido in df.columns:
                votos = int(row[partido]) if pd.notna(row[partido]) else 0
            else:
                # Buscar en aliases
                for alias in partidos_aliases.get(partido, []):
                    if alias in df.columns:
                        votos = int(row[alias]) if pd.notna(row[alias]) else 0
                        break
            
            votos_partidos[partido] = votos
        
        # Encontrar partido ganador
        if votos_partidos:
            # Filtrar partidos con 0 votos
            votos_no_cero = {k: v for k, v in votos_partidos.items() if v > 0}
            if votos_no_cero:
                partido_ganador = max(votos_no_cero, key=votos_no_cero.get)
                votos_ganador = votos_no_cero[partido_ganador]
            else:
                partido_ganador = 'sin_datos'
                votos_ganador = 0
        else:
            partido_ganador = 'sin_datos'
            votos_ganador = 0
        
        # Calcular participación
        censo = row['total_censo_electoral'] if pd.notna(row['total_censo_electoral']) else 0
        votantes = row['total_votantes'] if pd.notna(row['total_votantes']) else 0
        participacion = (votantes / censo * 100) if censo > 0 else 0
        
        elecciones_data.append({
            'municipio_ine': row['codigo_ine'],
            # Datos base
            'num_mesas': int(row['número_de_mesas']) if pd.notna(row['número_de_mesas']) else 0,
            'censo': int(censo),
            'votantes': int(votantes),
            'votos_validos': int(row['votos_válidos']) if pd.notna(row['votos_válidos']) else 0,
            'votos_candidaturas': int(row['votos_a_candidaturas']) if pd.notna(row['votos_a_candidaturas']) else 0,
            'votos_blanco': int(row['votos_en_blanco']) if pd.notna(row['votos_en_blanco']) else 0,
            'votos_nulos': int(row['votos_nulos']) if pd.notna(row['votos_nulos']) else 0,
            # Partidos (solo 14 principales)
            'pp': votos_partidos.get('pp', 0),
            'psoe': votos_partidos.get('psoe', 0),
            'vox': votos_partidos.get('vox', 0),
            'sumar': votos_partidos.get('sumar', 0),
            'erc': votos_partidos.get('erc', 0),
            'jxcat_junts': votos_partidos.get('jxcat_junts', 0),
            'eh_bildu': votos_partidos.get('eh_bildu', 0),
            'eaj_pnv': votos_partidos.get('eaj_pnv', 0),
            'bng': votos_partidos.get('bng', 0),
            'cca': votos_partidos.get('cca', 0),
            'upn': votos_partidos.get('upn', 0),
            'pacma': votos_partidos.get('pacma', 0),
            'cup_pr': votos_partidos.get('cup_pr', 0),
            'fo': votos_partidos.get('fo', 0),
            # Campos calculados
            'participacion': round(participacion, 2),
            'partido_ganador': partido_ganador,
            'votos_ganador': votos_ganador,
            'total_votos_partidos': sum(votos_partidos.values())
        })
    
    print(f"   ✅ {len(elecciones_data)} resultados electorales preparados")
    
    # 7. CONECTAR A POSTGRESQL Y CARGAR DATOS
    print("\n💾 Conectando a PostgreSQL...")
    try:
        conn = psycopg2.connect(**db_config)
        cur = conn.cursor()
        print("   ✅ Conexión establecida")
    except Exception as e:
        print(f"❌ Error conectando a PostgreSQL: {e}")
        return 0, 0
    
    try:
        # 7.1 Crear tabla municipios si no existe
        print("🗃️ Creando/verificando tablas...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS municipios_espana (
                codigo_ine VARCHAR(5) PRIMARY KEY,
                nombre_municipio VARCHAR(100),
                nombre_provincia VARCHAR(50),
                nombre_comunidad VARCHAR(50),
                poblacion INTEGER,
                lat DECIMAL(9,6),
                lon DECIMAL(9,6),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("   ✅ Tabla municipios_espana creada/verificada")
        
        # 7.2 Crear tabla elecciones si no existe
        cur.execute("""
            CREATE TABLE IF NOT EXISTS elecciones_congreso_2023 (
                id SERIAL PRIMARY KEY,
                municipio_ine VARCHAR(5) UNIQUE REFERENCES municipios_espana(codigo_ine),
                -- Datos base
                num_mesas INTEGER,
                censo INTEGER,
                votantes INTEGER,
                votos_validos INTEGER,
                votos_candidaturas INTEGER,
                votos_blanco INTEGER,
                votos_nulos INTEGER,
                -- Partidos principales (14)
                pp INTEGER,
                psoe INTEGER,
                vox INTEGER,
                sumar INTEGER,
                erc INTEGER,
                jxcat_junts INTEGER,
                eh_bildu INTEGER,
                eaj_pnv INTEGER,
                bng INTEGER,
                cca INTEGER,
                upn INTEGER,
                pacma INTEGER,
                cup_pr INTEGER,
                fo INTEGER,
                -- Campos calculados
                participacion DECIMAL(5,2),
                partido_ganador VARCHAR(50),
                votos_ganador INTEGER,
                total_votos_partidos INTEGER,
                -- Metadata
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("   ✅ Tabla elecciones_congreso_2023 creada/verificada")
        
        # 7.3 Insertar datos de municipios
        print(f"\n📤 Insertando {len(municipios_data)} municipios...")
        municipios_sql = """
            INSERT INTO municipios_espana 
            (codigo_ine, nombre_municipio, nombre_provincia, nombre_comunidad, poblacion, lat, lon)
            VALUES %s
            ON CONFLICT (codigo_ine) DO UPDATE SET
                nombre_municipio = EXCLUDED.nombre_municipio,
                nombre_provincia = EXCLUDED.nombre_provincia,
                nombre_comunidad = EXCLUDED.nombre_comunidad,
                poblacion = EXCLUDED.poblacion,
                updated_at = CURRENT_TIMESTAMP
        """
        
        municipios_values = [
            (m['codigo_ine'], m['nombre_municipio'], m['nombre_provincia'], 
             m['nombre_comunidad'], m['poblacion'], m['lat'], m['lon'])
            for m in municipios_data
        ]
        
        execute_values(cur, municipios_sql, municipios_values)
        print(f"   ✅ Municipios insertados/actualizados")
        
        # 7.4 Insertar datos electorales
        print(f"\n📊 Insertando {len(elecciones_data)} resultados electorales...")
        elecciones_sql = """
            INSERT INTO elecciones_congreso_2023 
            (municipio_ine, num_mesas, censo, votantes, votos_validos, 
             votos_candidaturas, votos_blanco, votos_nulos,
             pp, psoe, vox, sumar, erc, jxcat_junts, eh_bildu, eaj_pnv,
             bng, cca, upn, pacma, cup_pr, fo,
             participacion, partido_ganador, votos_ganador, total_votos_partidos)
            VALUES %s
            ON CONFLICT (municipio_ine) DO UPDATE SET
                num_mesas = EXCLUDED.num_mesas,
                censo = EXCLUDED.censo,
                votantes = EXCLUDED.votantes,
                votos_validos = EXCLUDED.votos_validos,
                votos_candidaturas = EXCLUDED.votos_candidaturas,
                votos_blanco = EXCLUDED.votos_blanco,
                votos_nulos = EXCLUDED.votos_nulos,
                pp = EXCLUDED.pp,
                psoe = EXCLUDED.psoe,
                vox = EXCLUDED.vox,
                sumar = EXCLUDED.sumar,
                erc = EXCLUDED.erc,
                jxcat_junts = EXCLUDED.jxcat_junts,
                eh_bildu = EXCLUDED.eh_bildu,
                eaj_pnv = EXCLUDED.eaj_pnv,
                bng = EXCLUDED.bng,
                cca = EXCLUDED.cca,
                upn = EXCLUDED.upn,
                pacma = EXCLUDED.pacma,
                cup_pr = EXCLUDED.cup_pr,
                fo = EXCLUDED.fo,
                participacion = EXCLUDED.participacion,
                partido_ganador = EXCLUDED.partido_ganador,
                votos_ganador = EXCLUDED.votos_ganador,
                total_votos_partidos = EXCLUDED.total_votos_partidos,
                created_at = CURRENT_TIMESTAMP
        """
        
        elecciones_values = [
            (
                e['municipio_ine'], e['num_mesas'], e['censo'], e['votantes'], 
                e['votos_validos'], e['votos_candidaturas'], e['votos_blanco'], e['votos_nulos'],
                e['pp'], e['psoe'], e['vox'], e['sumar'], e['erc'], 
                e['jxcat_junts'], e['eh_bildu'], e['eaj_pnv'],
                e['bng'], e['cca'], e['upn'], e['pacma'], e['cup_pr'], e['fo'],
                e['participacion'], e['partido_ganador'], e['votos_ganador'], e['total_votos_partidos']
            )
            for e in elecciones_data
        ]
        
        execute_values(cur, elecciones_sql, elecciones_values)
        print(f"   ✅ Resultados electorales insertados/actualizados")
        
        conn.commit()
        
        # Verificar inserciones
        cur.execute("SELECT COUNT(*) FROM municipios_espana")
        count_mun = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM elecciones_congreso_2023")
        count_elec = cur.fetchone()[0]
        
        print(f"\n📊 ESTADÍSTICAS BD:")
        print(f"   Municipios en BD: {count_mun}")
        print(f"   Resultados electorales en BD: {count_elec}")
        
    except Exception as e:
        print(f"❌ Error durante la operación de base de datos: {e}")
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()
        print("🔒 Conexión cerrada")
    
    print("\n✅ Proceso completado exitosamente!")
    return len(municipios_data), len(elecciones_data)

def main():
    """Función principal"""
    print("=" * 60)
    print("📊 SCRIPT DE CARGA DE DATOS ELECTORALES")
    print("=" * 60)
    
    try:
        # Obtener configuración
        db_config = get_db_config()
        
        # Obtener ruta del Excel
        excel_path = get_excel_path()
        
        # Preguntar límite
        print("\n¿Cuántos registros quieres procesar?")
        print("  (Enter para todos, número para limitar, 'q' para salir)")
        limit_input = input("> ").strip()
        
        if limit_input.lower() == 'q':
            print("👋 Saliendo...")
            return
        
        limit = int(limit_input) if limit_input.isdigit() else None
        if limit:
            print(f"⚡ Procesando solo {limit} registros...")
        
        # Procesar
        count_mun, count_elec = process_excel_to_postgres(
            excel_path,
            db_config,
            limit=limit
        )
        
        print("\n" + "=" * 60)
        print("📈 RESUMEN FINAL:")
        print(f"   Municipios procesados: {count_mun}")
        print(f"   Resultados electorales: {count_elec}")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n💥 ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()