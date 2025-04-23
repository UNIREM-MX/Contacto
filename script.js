document.addEventListener('DOMContentLoaded', function() {
    const preregForm = document.getElementById('prereg-contact-form');
    const submitButton = document.getElementById('submit-prereg-button');
    const statusDiv = document.getElementById('prereg-form-status');
    // --- ¡¡ASEGÚRATE QUE ESTA URL ES LA CORRECTA Y COMPLETA!! ---
    const googleAppsScriptURL = 'https://script.google.com/macros/s/AKfycbyIty-E3gYlF2sr4nDwcqENRWpfKczUQrGn5Z5AeBmA5C7uS16OKqWsPTXMzynRG38D/exec'; // <<< AQUI VA TU URL DE GOOGLE APPS SCRIPT
    // ---

    console.log("Script cargado."); // Log 1

    if (!googleAppsScriptURL || googleAppsScriptURL.includes('AQUI_VA_TU_URL')) {
        console.error("Error Crítico: ¡Falta configurar la 'googleAppsScriptURL' correctamente!");
        if(statusDiv) statusDiv.textContent = "Error: URL de destino no configurada.";
        if(submitButton) submitButton.disabled = true;
        return;
    }

    if (preregForm && submitButton && statusDiv) {
        console.log("Elementos del DOM encontrados."); // Log 2

        preregForm.addEventListener('submit', async function(event) {
            event.preventDefault(); // Prevenir envío normal
            console.log("Submit detectado. Prevenimos default."); // Log 3

            // Validación simple (HTML5 'required' debería funcionar antes, pero doble check)
            let isValid = preregForm.checkValidity();
            if (!isValid) {
                 statusDiv.textContent = 'Por favor, completa todos los campos requeridos.';
                 statusDiv.className = 'form-status form-status-on-dark error';
                 console.log("Formulario inválido (JS checkValidity)."); // Log 4 INVALID
                 // preregForm.reportValidity(); // Opcional: Muestra popups del navegador
                 return;
            }
            console.log("Formulario válido."); // Log 5 VALID

            // --- Feedback Visual: Iniciando envío ---
            statusDiv.textContent = 'Enviando tus datos...';
            statusDiv.className = 'form-status form-status-on-dark processing';
            submitButton.disabled = true;
            const originalButtonHTML = submitButton.innerHTML;
            submitButton.innerHTML = `Enviando...`; // Feedback simple
            console.log("Estado: Enviando a", googleAppsScriptURL); // Log 6 SENDING

            const formData = new FormData(preregForm);

            try {
                const response = await fetch(googleAppsScriptURL, {
                    method: 'POST',
                    body: formData,
                    // mode: 'no-cors', // <<< SOLO DESCOMENTA esto si sospechas problemas raros de CORS/redirect
                });

                // *** ESTE LOG ES CRUCIAL ***
                console.log("Fetch completado. Status:", response.status, "OK:", response.ok, "Type:", response.type, "URL:", response.url); // Log 7 FETCH DONE

                if (response.ok) { // ¿Respuesta HTTP fue exitosa (status 200-299)?
                    console.log("Respuesta OK (status 2xx). Intentando leer cuerpo..."); // Log 8 OK
                    let responseBody = '';
                    let resultJson = null;
                    let isAppScriptSuccess = false; // Asumimos fallo hasta confirmar lo contrario

                    try {
                         responseBody = await response.text(); // Leer SIEMPRE como texto primero
                         console.log("Respuesta como TEXTO:", responseBody); // Log 9 TEXT
                         if (responseBody) {
                             try {
                                 resultJson = JSON.parse(responseBody);
                                 console.log("Respuesta parseada como JSON:", resultJson); // Log 10 JSON

                                 // *** ¡¡NUEVA LÓGICA AQUÍ!! ***
                                 // Comprueba si el JSON indica éxito explícitamente
                                 // (Ajusta 'success' o 'ok' según lo que devuelva tu script en caso de ÉXITO REAL)
                                 if (resultJson.result === 'success' || resultJson.status === 'success' || resultJson.success === true ) {
                                     isAppScriptSuccess = true;
                                 } else {
                                     console.warn("JSON recibido, pero no indica éxito explícito:", resultJson);
                                     // Mantenemos isAppScriptSuccess = false
                                 }

                             } catch (jsonError) {
                                  console.warn("La respuesta OK no era JSON (o JSON inválido):", jsonError); // Log 11 NOT JSON
                                  // Si no es JSON, pero fue 200 OK, podrías considerar éxito si tu script a veces no devuelve JSON
                                  // isAppScriptSuccess = true; // Descomenta si un 200 OK sin JSON es éxito para ti
                             }
                         } else {
                             console.log("Respuesta OK pero cuerpo vacío."); // Log 12 EMPTY BODY
                             // Decide si un cuerpo vacío con 200 OK es éxito para ti
                             // isAppScriptSuccess = true; // Descomenta si aplica
                         }
                    } catch (textError) {
                         console.error("Error al leer respuesta como texto:", textError); // Log 9.1 TEXT ERROR
                         isAppScriptSuccess = false; // Error leyendo la respuesta
                    }

                    // *** Mostrar mensaje según el ÉXITO REAL del Apps Script ***
                    if (isAppScriptSuccess) {
                        let resultMessage = (resultJson && resultJson.message) ? resultJson.message : '¡Registro exitoso!';
                        statusDiv.textContent = resultMessage;
                        statusDiv.className = 'form-status form-status-on-dark success';
                        console.log("-> Mostrando mensaje ÉXITO:", resultMessage); // Log 13 SUCCESS MSG
                        preregForm.reset();
                    } else {
                        // La operación falló aunque el HTTP status fuera 200
                        let errorMessage = (resultJson && resultJson.message) ? resultJson.message : 'Error en el procesamiento del servidor.';
                        statusDiv.textContent = `Error: ${errorMessage}`;
                        statusDiv.className = 'form-status form-status-on-dark error';
                        console.error("-> Mostrando mensaje ERROR (AppScript falló pero HTTP OK):", errorMessage); // Log ERROR APP SCRIPT
                    }

                } else { // La respuesta HTTP NO fue OK (ej. 4xx, 5xx)
                    // ... (el código del bloque 'else' que ya tenías para errores HTTP sigue igual) ...
                    console.error(`Respuesta NO OK. Status: ${response.status} ${response.statusText}`); // Log 14 NOT OK
                    let errorBody = "(No se pudo leer cuerpo del error)";
                    try {
                        errorBody = await response.text(); // Intenta leer el cuerpo del error
                        console.error("Cuerpo de la respuesta de error:", errorBody); // Log 15 ERROR BODY
                    } catch (e) {}
                    statusDiv.textContent = `Error de servidor (${response.status}). Intenta de nuevo.`;
                    statusDiv.className = 'form-status form-status-on-dark error';
                    console.log("-> Mostrando mensaje ERROR HTTP:", statusDiv.textContent); // Log 16 ERROR MSG
                }
            } catch (error) { // Error de Red (CORS, DNS, sin conexión, etc.)
                console.error('Error en CATCH del fetch (Red/CORS?):', error); // Log 17 CATCH ERROR
                statusDiv.textContent = 'Error de conexión. Verifica tu red.';
                statusDiv.className = 'form-status form-status-on-dark error';
                console.log("-> Mostrando mensaje ERROR CATCH:", statusDiv.textContent); // Log 18 CATCH MSG
            } finally {
                // --- Siempre se ejecuta al final ---
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonHTML;
                console.log("Finally: Botón rehabilitado."); // Log 19 FINALLY
            }
        });

    } else {
        console.error("Error: No se encontraron todos los elementos del DOM (form, button, status div)."); // Log 20 DOM ERROR
    }
});