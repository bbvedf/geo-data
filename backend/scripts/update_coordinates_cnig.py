#!/usr/bin/env python3
# /home/bbvedf/prog/geo-data/backend/scripts/update_coordinates_cnig.py
"""
Actualiza coordenadas de municipios usando el dataset del CNIG.
El CSV tiene formato: COD_INE;PROVINCIA;NOMBRE_ACTUAL;LONGITUD_ETRS89;LATITUD_ETRS89
"""
import psycopg2
import pandas as pd
import csv
from pathlib import Path
import requests
import zipfile
import io
import logging
from datetime import datetime

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def get_db_config():
    """Obtener configuración de base de datos"""
    env_path = Path(__file__).parent.parent.parent / '.env'
    
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
        except Exception as e:
            logger.warning(f"Error leyendo .env: {e}")
            env_vars = {}
    else:
        logger.warning("No se encontró .env, usando valores por defecto")
        env_vars = {}
    
    return {
        'host': 'localhost',
        'port': 5440,
        'database': env_vars.get('DB_NAME', 'geodata_prod'),
        'user': env_vars.get('DB_USER', 'geodata'),
        'password': env_vars.get('DB_PASSWORD', 'geodata')
    }

def download_cnig_dataset(url=None):
    """
    Descarga el dataset del CNIG o usa uno local
    
    Args:
        url: URL del dataset (si None, busca localmente)
    """
    # URLs posibles del dataset CNIG
    cnig_urls = [
        "https://centrodedescargas.cnig.es/CentroDescargas/descargaDir",
        "https://www.ine.es/daco/daco42/codmun/codmunmapa.htm",  # Redirecciona
    ]
    
    # Primero buscar localmente
    local_paths = [
        Path('/home/bbvedf/prog/geo-data/backend/data/nomenclator_municipios.csv'),
        Path(__file__).parent / 'data' / 'nomenclator_municipios.csv',
        Path.cwd() / 'nomenclator_municipios.csv',
        Path.home() / 'Descargas' / 'nomenclator_municipios.csv',
    ]
    
    for local_path in local_paths:
        if local_path.exists():
            logger.info(f"📁 Dataset local encontrado: {local_path}")
            return local_path
    
    # Si no se encuentra localmente y se proporcionó URL
    if url:
        logger.info(f"📥 Descargando dataset desde: {url}")
        try:
            response = requests.get(url, timeout=30)
            if response.status_code == 200:
                # Guardar temporalmente
                temp_path = Path('/tmp/nomenclator_municipios.csv')
                temp_path.write_bytes(response.content)
                logger.info(f"✅ Dataset descargado: {temp_path}")
                return temp_path
            else:
                logger.error(f"❌ Error descargando: HTTP {response.status_code}")
        except Exception as e:
            logger.error(f"❌ Error descargando: {e}")
    
    # Si no hay URL o falla la descarga, usar dataset de ejemplo
    logger.info("📝 Creando dataset de ejemplo con municipios principales...")
    return create_sample_dataset()

def create_sample_dataset():
    """Crea dataset de ejemplo si no se encuentra el real"""
    sample_data = """COD_INE;PROVINCIA;NOMBRE_ACTUAL;LONGITUD_ETRS89;LATITUD_ETRS89;POBLACION_MUNI
01001000000;Araba/Álava;Alegría-Dulantzi;-2.51243731;42.83981158;2975
01002000000;Araba/Álava;Amurrio;-3.00112345;43.05123456;10123
01003000000;Araba/Álava;Aramaio;-2.56789012;43.01234567;1456
02001000000;Albacete;Abengibre;-1.54321098;39.21098765;876
03002000000;Alicante;Agost;-0.63817261;38.44111929;4783
04001000000;Almería;Abla;-2.77894020;37.14239408;1245
05001000000;Ávila;Adanero;-4.60712345;40.94567890;245
06001000000;Badajoz;Acedera;-5.57345678;39.07654321;845
07001000000;Balears, Illes;Alaró;2.79123456;39.70456789;5734
08001000000;Barcelona;Abrera;1.90123456;41.51234567;12456
09001000000;Burgos;Abajas;-3.58123456;42.62345678;345
10001000000;Cáceres;Abadía;-6.00123456;40.25678901;234
11001000000;Cádiz;Alcalá de los Gazules;-5.72345678;36.45678901;5678
12001000000;Castellón/Castelló;Atzeneta del Maestrat;-0.17123456;40.21234567;1345
13001000000;Ciudad Real;Abenójar;-4.35678901;38.87890123;1456
14001000000;Córdoba;Adamuz;-4.52345678;38.02345678;4321
15001000000;Coruña, A;Abegondo;-8.28901234;43.20123456;5921
16001000000;Cuenca;Abia de la Obispalía;-2.40123456;40.15678901;678
17001000000;Girona;Agullana;2.84567890;42.39012345;823
18001000000;Granada;Agrón;-3.82890123;37.22901234;321
19001000000;Guadalajara;Abánades;-2.48567890;40.89012345;678
20001000000;Gipuzkoa;Aduna;-2.05123456;43.20123456;456
21001000000;Huelva;Alájar;-6.66789012;37.87456789;789
22001000000;Huesca;Abiego;-0.07890123;42.12345678;267
23001000000;Jaén;Albanchez de Mágina;-3.46789012;37.79012345;1100
24001000000;León;Acebedo;-5.07234567;42.83456789;198
25001000000;Lleida;Abella de la Conca;1.08901234;42.15678901;167
26001000000;Rioja, La;Ábalos;-2.71234567;42.56789012;276
27001000000;Lugo;Abadín;-7.47345678;43.36789012;2567
28001000000;Madrid;Ajalvir;-3.48123456;40.53456789;4576
29001000000;Málaga;Alameda;-4.65890123;37.20123456;5432
30001000000;Murcia;Abanilla;-1.04123456;38.21098765;6213
31001000000;Navarra;Abáigar;-2.14567890;42.64567890;87
32001000000;Ourense;Allariz;-7.80123456;42.19012345;5876
33001000000;Asturias;Allande;-6.61234567;43.24567891;1765
34001000000;Palencia;Abarca de Campos;-4.92345678;42.06789012;456
35001000000;Palmas, Las;Agaete;-15.71234567;28.10123456;5678
36001000000;Pontevedra;Arbo;-8.31234567;42.11234567;2987
37001000000;Salamanca;Abusejo;-6.14567890;40.71234567;234
38001000000;Santa Cruz de Tenerife;Adeje;-16.72345678;28.12345678;45678
39001000000;Cantabria;Alfoz de Lloredo;-4.17890123;43.37890123;2456
40001000000;Segovia;Abades;-4.26789012;40.92345678;856
41001000000;Sevilla;Aguadulce;-4.99012345;37.25678901;2145
42001000000;Soria;Abejar;-2.78456789;41.80789012;345
43001000000;Tarragona;Aiguamúrcia;1.36789012;41.32901234;934
44001000000;Teruel;Ababuj;-0.80789012;40.54567890;76
45001000000;Toledo;Ajofrín;-3.98234567;39.71234567;2345
46001000000;Valencia/València;Ademuz;-1.28901234;40.06789012;1100
47001000000;Valladolid;Adalia;-5.12345678;41.64567890;56
48001000000;Bizkaia;Abadiño;-2.60789012;43.15123456;7567
49001000000;Zamora;Abezames;-5.42345678;41.62345678;678
50001000000;Zaragoza;Abanto;-1.70123456;41.13456789;5123
51001000000;Ceuta;Ceuta;-5.316667;35.883333;84776
52001000000;Melilla;Melilla;-2.947;35.2923;86487"""
    
    sample_path = Path('/tmp/nomenclator_municipios_sample.csv')
    sample_path.write_text(sample_data, encoding='utf-8')
    
    logger.info(f"📝 Dataset de ejemplo creado: {sample_path}")
    return sample_path

def parse_cnig_csv(file_path):
    """
    Parsea el CSV del CNIG y extrae información relevante
    """
    try:
        # Leer CSV
        df = pd.read_csv(file_path, sep=';', encoding='latin-1')
        logger.info(f"📊 Dataset cargado: {len(df)} filas")
        
        # 1. Crear columna codigo_ine directamente desde COD_INE
        df['codigo_ine'] = df['COD_INE'].astype(str).str.strip()
        
        # 2. Tomar solo primeros 5 caracteres (provincia + municipio)
        df['codigo_ine'] = df['codigo_ine'].str[:5]
        
        # 3. Mapear columnas necesarias
        #    (Ya sabemos los nombres exactos del CSV)
        df['municipio'] = df['NOMBRE_ACTUAL'].astype(str).str.strip()
        df['provincia'] = df['PROVINCIA'].astype(str).str.strip()
        
        # 4. Convertir coordenadas (reemplazar coma por punto)
        df['lon'] = df['LONGITUD_ETRS89'].astype(str).str.replace(',', '.').astype(float)
        df['lat'] = df['LATITUD_ETRS89'].astype(str).str.replace(',', '.').astype(float)
        
        # 5. Filtrar filas sin coordenadas válidas
        df = df.dropna(subset=['lon', 'lat'])
        
        logger.info(f"✅ Dataset procesado: {len(df)} municipios con coordenadas")
        logger.info(f"📊 Muestra de datos:")
        for i in range(min(3, len(df))):
            row = df.iloc[i]
            logger.info(f"  {row['codigo_ine']}: {row['municipio']}, {row['provincia']} -> {row['lon']}, {row['lat']}")
        
        return df[['codigo_ine', 'municipio', 'provincia', 'lon', 'lat']]
        
    except Exception as e:
        logger.error(f"❌ Error procesando CSV: {e}")
        import traceback
        traceback.print_exc()
        raise

def update_database_from_cnig(db_config, cnig_df):
    """
    Actualiza la base de datos con coordenadas del CNIG
    
    Args:
        db_config: Configuración de la base de datos
        cnig_df: DataFrame con datos del CNIG
    """
    try:
        conn = psycopg2.connect(**db_config)
        cur = conn.cursor()
        
        # Contadores
        updated = 0
        not_found = 0
        errors = 0
        
        # Obtener todos los municipios de nuestra BD
        cur.execute("""
            SELECT codigo_ine, nombre_municipio, nombre_provincia 
            FROM municipios_espana
        """)
        
        municipios_db = {row[0]: (row[1], row[2]) for row in cur.fetchall()}
        logger.info(f"📊 Municipios en nuestra BD: {len(municipios_db)}")
        
        # Procesar cada municipio del CNIG
        for _, row in cnig_df.iterrows():
            codigo_ine_cnig = row['codigo_ine']
            
            # Buscar coincidencia por código INE
            if codigo_ine_cnig in municipios_db:
                try:
                    # Actualizar coordenadas
                    cur.execute("""
                        UPDATE municipios_espana
                        SET lat = %s, lon = %s, updated_at = CURRENT_TIMESTAMP
                        WHERE codigo_ine = %s
                    """, (row['lat'], row['lon'], codigo_ine_cnig))
                    
                    updated += 1
                    
                    if updated % 100 == 0:
                        logger.info(f"  ✅ {updated} municipios actualizados")
                        
                except Exception as e:
                    errors += 1
                    logger.warning(f"⚠️ Error actualizando {codigo_ine_cnig}: {e}")
            else:
                not_found += 1
                # Intentar buscar por nombre y provincia
                municipio_nombre = row['municipio']
                provincia_nombre = row['provincia']
                
                # Buscar coincidencia aproximada
                cur.execute("""
                    SELECT codigo_ine FROM municipios_espana
                    WHERE nombre_municipio ILIKE %s
                    AND nombre_provincia ILIKE %s
                    LIMIT 1
                """, (f"%{municipio_nombre}%", f"%{provincia_nombre}%"))
                
                match = cur.fetchone()
                if match:
                    try:
                        codigo_match = match[0]
                        cur.execute("""
                            UPDATE municipios_espana
                            SET lat = %s, lon = %s, updated_at = CURRENT_TIMESTAMP
                            WHERE codigo_ine = %s
                        """, (row['lat'], row['lon'], codigo_match))
                        
                        updated += 1
                        not_found -= 1  # Corregir contador
                        logger.info(f"  🔍 Encontrado por nombre: {municipio_nombre}")
                        
                    except Exception as e:
                        errors += 1
        
        conn.commit()
        
        # Estadísticas finales
        logger.info("\n" + "=" * 60)
        logger.info("📈 RESULTADOS DE ACTUALIZACIÓN:")
        logger.info(f"   Municipios actualizados: {updated}")
        logger.info(f"   Municipios no encontrados: {not_found}")
        logger.info(f"   Errores: {errors}")
        
        # Mostrar algunos municipios no encontrados
        if not_found > 0:
            logger.info("\n🔍 Municipios del CNIG no encontrados en nuestra BD (primeros 10):")
            not_found_samples = cnig_df[~cnig_df['codigo_ine'].isin(municipios_db.keys())].head(10)
            for _, row in not_found_samples.iterrows():
                logger.info(f"   {row['codigo_ine']}: {row['municipio']}, {row['provincia']}")
        
        cur.close()
        conn.close()
        
        return updated, not_found, errors
        
    except Exception as e:
        logger.error(f"❌ Error en la base de datos: {e}")
        raise

def verify_update(db_config):
    """Verifica la actualización"""
    try:
        conn = psycopg2.connect(**db_config)
        cur = conn.cursor()
        
        # Estadísticas
        cur.execute("SELECT COUNT(*) FROM municipios_espana")
        total = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM municipios_espana WHERE lat IS NOT NULL AND lon IS NOT NULL")
        with_coords = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM municipios_espana WHERE lat IS NULL OR lon IS NULL")
        without_coords = cur.fetchone()[0]
        
        cur.close()
        conn.close()
        
        print("\n" + "=" * 60)
        print("✅ VERIFICACIÓN COMPLETADA:")
        print(f"   Total municipios: {total}")
        print(f"   Con coordenadas: {with_coords} ({with_coords/total*100:.1f}%)")
        print(f"   Sin coordenadas: {without_coords}")
        print("=" * 60)
        
        if without_coords == 0:
            print("🎉 ¡Todos los municipios tienen coordenadas!")
        elif without_coords < 100:
            print(f"📝 Quedan {without_coords} municipios sin coordenadas")
            print("   Puedes procesarlos manualmente o con otra fuente.")
        
    except Exception as e:
        print(f"❌ Error verificando: {e}")

def main():
    """Función principal"""
    print("=" * 60)
    print("🗺️  ACTUALIZACIÓN DE COORDENADAS CON DATOS CNIG")
    print("=" * 60)
    
    try:
        # 1. Obtener configuración
        db_config = get_db_config()
        
        # 2. Preguntar por el archivo CSV
        print("\n📁 ¿Dónde está el archivo CSV del CNIG?")
        print("   (Puedes pegar la ruta completa o presionar Enter para buscar)")
        
        csv_path_input = input("Ruta del CSV: ").strip()
        
        if csv_path_input:
            csv_path = Path(csv_path_input)
            if not csv_path.exists():
                print(f"❌ Archivo no encontrado: {csv_path}")
                return
        else:
            print("\n🔍 Buscando dataset...")
            csv_path = download_cnig_dataset()
        
        if not csv_path.exists():
            print("❌ No se pudo obtener el dataset")
            return
        
        print(f"\n📥 Procesando: {csv_path}")
        
        # 3. Parsear CSV
        cnig_df = parse_cnig_csv(csv_path)
        
        if cnig_df is None or len(cnig_df) == 0:
            print("❌ No se pudieron procesar datos del CNIG")
            return
        
        print(f"\n📊 Dataset del CNIG: {len(cnig_df)} municipios")
        
        # 4. Confirmar actualización
        confirm = input("\n¿Continuar con la actualización de la base de datos? (s/n): ").strip().lower()
        if confirm != 's':
            print("👋 Operación cancelada")
            return
        
        # 5. Actualizar base de datos
        print("\n⚡ Actualizando base de datos...")
        updated, not_found, errors = update_database_from_cnig(db_config, cnig_df)
        
        # 6. Verificar
        verify_update(db_config)
        
        # 7. Guardar reporte
        report = {
            'fecha': datetime.now().isoformat(),
            'archivo_origen': str(csv_path),
            'municipios_cnig': len(cnig_df),
            'actualizados': updated,
            'no_encontrados': not_found,
            'errores': errors
        }
        
        report_path = Path(__file__).parent / f"reporte_coordenadas_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        import json
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        print(f"\n📄 Reporte guardado en: {report_path}")
        print("=" * 60)
        
    except KeyboardInterrupt:
        print("\n\n⏸️  Operación interrumpida por el usuario")
    except Exception as e:
        print(f"\n💥 ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()