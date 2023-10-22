const submitButton = document.getElementById("submit");
const obfuscated = document.getElementById("obfuscated");
const raw = document.getElementById("raw");
// const preview = document.getElementById("preview");

submitButton.onclick = () => {
  raw.focus();
  obfuscateIt(raw.value);
};

const obfuscateIt = async (rawHtml) => {
  const data = {
    rawHtml,
  };
  const response = await fetch("/obfuscate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  const jsonResponse = await response.json();
  obfuscated.value = jsonResponse.obfuscatedHtml;
  // // Inject response text into iframe
  // preview.srcdoc = jsonResponse.obfuscatedHtml;
};
