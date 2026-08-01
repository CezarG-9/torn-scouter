const apiKeyInput = document.querySelector("#api-key");
const connectButton = document.querySelector("#connect-button");
const statusElement = document.querySelector("#status");
const finderSection = document.querySelector("#finder-section");

const companyTypeSelect =
    document.querySelector("#company-type");
const finderStatusElement =
    document.querySelector("#finder-status");
const perksSection =
    document.querySelector("#perks-section");
const perksTitle =
    document.querySelector("#perks-title");
const perksList =
    document.querySelector("#perks-list");
const minimumStarsSelect =
    document.querySelector("#minimum-stars");

let activeApiKey = null;
let companyDefinitions = {};

connectButton.addEventListener("click", connectToTorn);

companyTypeSelect.addEventListener("change", displaySelectedCompanyPerks);

minimumStarsSelect.addEventListener("change", updatePerkAvailability);

async function loadCompanyTypes(apiKey) {
    finderStatusElement.textContent =
        "Loading company types...";

    const response = await fetch(
        "https://api.torn.com/v2/torn?selections=companies",
        {
            headers: {
                Authorization: `ApiKey ${apiKey}`
            }
        }
    );

    const data = await response.json();

    if (!response.ok || data.error) {
        throw new Error(
            data.error?.error ??
            "Could not load Torn company information."
        );
    }

    if (!data.companies) {
        throw new Error(
            "Torn returned no company information."
        );
    }

    companyDefinitions = data.companies;

    populateCompanyTypeSelect();

    finderStatusElement.textContent =
        `${Object.keys(companyDefinitions).length} company types loaded.`;
}

function populateCompanyTypeSelect() {
    companyTypeSelect.replaceChildren();

    const placeholderOption =
        document.createElement("option");

    placeholderOption.value = "";
    placeholderOption.textContent =
        "Select a company type";

    companyTypeSelect.append(placeholderOption);

    const companyTypes =
        Object.entries(companyDefinitions);

    companyTypes.sort((firstCompany, secondCompany) => {
        const firstName = firstCompany[1].name;
        const secondName = secondCompany[1].name;

        return firstName.localeCompare(secondName);
    });

    for (const [companyTypeId, companyType] of companyTypes) {
        const option = document.createElement("option");

        option.value = companyTypeId;
        option.textContent = companyType.name;

        companyTypeSelect.append(option);
    }
}

async function connectToTorn() {
    const apiKey = apiKeyInput.value.trim();

    activeApiKey = null;
    finderSection.hidden = true;

    if (apiKey.length !== 16) {
        statusElement.textContent =
            "Please enter a valid 16-character Torn API key.";

        return;
    }

    statusElement.textContent = "Connecting to Torn...";
    connectButton.disabled = true;

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

        if (!response.ok || data.error) {
            throw new Error(
                data.error?.error ?? "Torn rejected the API key."
            );
        }

        const accessType = data.info?.access?.type;

        if (!accessType) {
            throw new Error("Torn returned an unexpected response.");
        }

        activeApiKey = apiKey;

        await loadCompanyTypes(activeApiKey);

        finderSection.hidden = false;

        statusElement.textContent =
            `Connected successfully. Access: ${accessType}.`;
    } catch (error) {
        console.error(error);

        activeApiKey = null;
        finderSection.hidden = true;

        statusElement.textContent =
            `Connection failed: ${error.message}`;
    } finally {
        connectButton.disabled = false;
    }
}

function displaySelectedCompanyPerks() {
    const selectedCompanyTypeId =
        companyTypeSelect.value;

    perksSection.hidden = true;
    perksList.replaceChildren();

    minimumStarsSelect.value = "";
    minimumStarsSelect.disabled = true;

    if (!selectedCompanyTypeId) {
        return;
    }

    const selectedCompany =
        companyDefinitions[selectedCompanyTypeId];

    if (!selectedCompany) {
        finderStatusElement.textContent =
            "The selected company type could not be found.";

        return;
    }

    minimumStarsSelect.disabled = false;

    const specials =
        Object.entries(selectedCompany.specials ?? {});

    specials.sort((firstSpecial, secondSpecial) => {
        return firstSpecial[1].rating_required
            - secondSpecial[1].rating_required;
    });

    perksTitle.textContent =
        `${selectedCompany.name} perks`;

    if (specials.length === 0) {
        const emptyMessage =
            document.createElement("p");

        emptyMessage.textContent =
            "No perks were returned for this company type.";

        perksList.append(emptyMessage);
        perksSection.hidden = false;

        return;
    }

    for (const [specialName, special] of specials) {
        const perkCard =
            document.createElement("article");

        perkCard.classList.add("perk-card");

        perkCard.dataset.ratingRequired =
            special.rating_required;

        const perkName =
            document.createElement("h4");

        perkName.textContent =
            `${special.rating_required}★ — ${specialName}`;

        const perkEffect =
            document.createElement("p");

        perkEffect.textContent =
            special.effect;

        const perkCost =
            document.createElement("p");

        if (special.cost === 0) {
            perkCost.textContent =
                "Cost: Passive perk";
        } else {
            const pointWord =
                special.cost === 1
                    ? "job point"
                    : "job points";

            perkCost.textContent =
                `Cost: ${special.cost} ${pointWord}`;
        }

        perkCard.append(
            perkName,
            perkEffect,
            perkCost
        );

        perksList.append(perkCard);
    }

    perksSection.hidden = false;
}

function updatePerkAvailability() {
    const selectedMinimumStars =
        Number(minimumStarsSelect.value);

    const perkCards =
        perksList.querySelectorAll(".perk-card");

    for (const perkCard of perkCards) {
        perkCard.classList.remove(
            "perk-unlocked",
            "perk-locked"
        );

        if (!selectedMinimumStars) {
            continue;
        }

        const requiredStars =
            Number(perkCard.dataset.ratingRequired);

        if (requiredStars <= selectedMinimumStars) {
            perkCard.classList.add("perk-unlocked");
        } else {
            perkCard.classList.add("perk-locked");
        }
    }
}