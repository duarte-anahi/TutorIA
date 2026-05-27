import os

def generar_arbol(directorio, ignorar, nombre_archivo):
    # Mantenemos utf-8 por buena práctica, aunque ya no haya emojis
    with open(nombre_archivo, 'w', encoding='utf-8') as f:
        for root, dirs, files in os.walk(directorio):
            # Filtramos las carpetas que no queremos
            dirs[:] = [d for d in dirs if d not in ignorar]
            
            # Calculamos la indentación
            nivel = root.replace(directorio, '').count(os.sep)
            sangria = ' ' * 4 * nivel
            
            # Formato para carpetas
            f.write(f'{sangria}[{os.path.basename(root) or directorio}/]\n')
            
            sub_sangria = ' ' * 4 * (nivel + 1)
            for archivo in files:
                # Formato para archivos
                f.write(f'{sub_sangria}- {archivo}\n')

# Lista de carpetas a ignorar
carpetas_ignoradas = {'venv', 'node_modules', '__pycache__', '.git', '.vscode'}

# Ejecutamos la función indicando el nombre del archivo de salida
generar_arbol('.', carpetas_ignoradas, 'estructura_limpia.txt')
print("¡Archivo 'estructura_limpia.txt' generado con éxito!")