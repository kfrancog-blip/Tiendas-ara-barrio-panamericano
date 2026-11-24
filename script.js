"use strict";

(() => {
  const storageKey = "ara-pasoancho-survey-v1";
  const form = document.querySelector("#survey-form");
  const feedback = document.querySelector("#survey-feedback");
  const count = document.querySelector("#survey-count");
  const downloadButton = document.querySelector("#survey-download");

  if (!form || !feedback || !count || !downloadButton) {
    return;
  }

  let responses = [];

  function showFeedback(message, kind) {
    feedback.textContent = message;
    feedback.className = `survey-form__feedback survey-form__feedback--${kind}`;
  }

  function updateResponseCount() {
    const total = responses.length;
    count.textContent = `${total} ${total === 1 ? "respuesta guardada" : "respuestas guardadas"} en este navegador.`;
    downloadButton.disabled = total === 0;
  }

  function readResponses() {
    const stored = window.localStorage.getItem(storageKey);
    if (stored === null) {
      return [];
    }

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      throw new Error("El formato de las respuestas guardadas no es válido.");
    }
    return parsed;
  }

  function csvCell(value) {
    let text = String(value == null ? "" : value);
    if (/^[\t\r\n ]*[=+\-@]/.test(text)) {
      text = `'${text}`;
    }
    return `"${text.replace(/"/g, '""')}"`;
  }

  function exportResponses() {
    const headers = ["Fecha", "Nombre o iniciales", "Rango de edad", "Preferencia", "Factores", "Comentario"];
    const rows = responses.map((response) => [
      response.date,
      response.name,
      response.age,
      response.preference,
      response.factors.join("; "),
      response.comment
    ]);
    const csv = `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
    const file = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = "respuestas-encuesta-ara-pasoancho.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  try {
    responses = readResponses();
    updateResponseCount();
  } catch (error) {
    showFeedback("No se pudieron leer las respuestas guardadas. No se ha modificado ningún dato.", "error");
    count.textContent = "Almacenamiento local no disponible.";
    form.querySelectorAll("input, select, textarea, button").forEach((control) => {
      control.disabled = true;
    });
    downloadButton.disabled = true;
    return;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) {
      return;
    }

    const data = new FormData(form);
    const response = {
      date: new Date().toISOString(),
      name: String(data.get("name") || "").trim(),
      age: String(data.get("age") || ""),
      preference: String(data.get("preference") || ""),
      factors: data.getAll("factors").map(String),
      comment: String(data.get("comment") || "").trim()
    };
    const updatedResponses = [...responses, response];

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(updatedResponses));
      responses = updatedResponses;
      updateResponseCount();
      form.reset();
      showFeedback("Respuesta guardada en este navegador. Descarga el CSV si quieres conservarla fuera de este dispositivo.", "success");
    } catch (error) {
      showFeedback("No se pudo guardar la respuesta en este navegador. Revisa el espacio disponible o la configuración de privacidad.", "error");
    }
  });

  downloadButton.addEventListener("click", () => {
    if (responses.length === 0) {
      showFeedback("No hay respuestas para descargar.", "info");
      return;
    }

    try {
      exportResponses();
      showFeedback("Se inició la descarga del CSV con las respuestas guardadas en este navegador.", "success");
    } catch (error) {
      showFeedback("No se pudo generar la descarga. Inténtalo de nuevo en este navegador.", "error");
    }
  });
})();
