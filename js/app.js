const apiKeyInput = document.querySelector("#api-key");
const connectButton = document.querySelector("#connect-button");
const statusElement = document.querySelector("#status");

connectButton.addEventListener("click", connectToTorn);

async function connectToTorn() {
    const apiKey = apiKeyInput.value.trim();

    if (apiKey.length !== 16) {
        statusElement.textContent =
            "Please enter a valid 16-character Torn API key.";

        return;
    }

    statusElement.textContent = "Connecting to Torn...";

    try {
        const response = await fetch(
            "https://api.torn.com/v2/key/info",
            {
                headers: {
                    Authorization: `ApiKey ${apiKey}`
                }
            }
        );

        const data = await response.json();

        console.log(data);

        if (!response.ok) {
            throw new Error(
                data.error?.error ?? "Torn rejected the API key."
            );
        }

        statusElement.textContent =
            `Connected successfully. Access: ${data.info.access.type}.`;
    } catch (error) {
        console.error(error);

        statusElement.textContent =
            `Connection failed: ${error.message}`;
    }
}