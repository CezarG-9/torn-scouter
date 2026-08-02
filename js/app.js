const apiKeyInput =
    document.querySelector("#api-key");

const connectButton =
    document.querySelector("#connect-button");

const statusElement =
    document.querySelector("#status");

const finderSection =
    document.querySelector("#finder-section");

const companyTypeSelect =
    document.querySelector("#company-type");

const minimumStarsSelect =
    document.querySelector("#minimum-stars");

const searchButton =
    document.querySelector("#search-button");

const finderStatusElement =
    document.querySelector("#finder-status");

const perksSection =
    document.querySelector("#perks-section");

const perksTitle =
    document.querySelector("#perks-title");

const perksList =
    document.querySelector("#perks-list");

const resultsSection =
    document.querySelector("#results-section");

const resultsStatusElement =
    document.querySelector("#results-status");

const resultsList =
    document.querySelector("#results-list");


let activeApiKey = null;
let companyDefinitions = {};


connectButton.addEventListener(
    "click",
    connectToTorn
);

companyTypeSelect.addEventListener(
    "change",
    handleCompanyTypeChange
);

minimumStarsSelect.addEventListener(
    "change",
    handleMinimumStarsChange
);

searchButton.addEventListener(
    "click",
    searchForVacancies
);


async function connectToTorn() {
    const apiKey =
        apiKeyInput.value.trim();

    activeApiKey = null;
    finderSection.hidden = true;

    resetFinderInterface();

    if (apiKey.length !== 16) {
        statusElement.textContent =
            "Please enter a valid 16-character Torn API key.";

        return;
    }

    statusElement.textContent =
        "Connecting to Torn...";

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

        const data =
            await response.json();

        if (!response.ok || data.error) {
            throw new Error(
                data.error?.error
                ?? "Torn rejected the API key."
            );
        }

        const accessType =
            data.info?.access?.type;

        if (!accessType) {
            throw new Error(
                "Torn returned an unexpected response."
            );
        }

        activeApiKey = apiKey;

        await loadCompanyTypes(activeApiKey);

        finderSection.hidden = false;

        updateSearchButtonState();

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

    const data =
        await response.json();

    if (!response.ok || data.error) {
        throw new Error(
            data.error?.error
            ?? "Could not load Torn company information."
        );
    }

    if (!data.companies) {
        throw new Error(
            "Torn returned no company information."
        );
    }

    companyDefinitions =
        data.companies;

    populateCompanyTypeSelect();

    const companyTypeCount =
        Object.keys(companyDefinitions).length;

    finderStatusElement.textContent =
        `${companyTypeCount} company types loaded.`;
}


function populateCompanyTypeSelect() {
    companyTypeSelect.replaceChildren(
        createCompanyPlaceholderOption()
    );

    const companyTypes =
        Object.entries(companyDefinitions);

    companyTypes.sort(
        (firstCompany, secondCompany) => {
            const firstName =
                firstCompany[1].name;

            const secondName =
                secondCompany[1].name;

            return firstName.localeCompare(
                secondName
            );
        }
    );

    for (
        const [companyTypeId, companyType]
        of companyTypes
    ) {
        const option =
            document.createElement("option");

        option.value =
            companyTypeId;

        option.textContent =
            companyType.name;

        companyTypeSelect.append(option);
    }
}


function createCompanyPlaceholderOption() {
    const placeholderOption =
        document.createElement("option");

    placeholderOption.value = "";

    placeholderOption.textContent =
        "Select a company type";

    return placeholderOption;
}


function handleCompanyTypeChange() {
    displaySelectedCompanyPerks();
    resetSearchResults();
    updateSearchButtonState();
}


function handleMinimumStarsChange() {
    updatePerkAvailability();
    resetSearchResults();
    updateSearchButtonState();
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
        Object.entries(
            selectedCompany.specials ?? {}
        );

    specials.sort(
        (firstSpecial, secondSpecial) => {
            return firstSpecial[1].rating_required
                - secondSpecial[1].rating_required;
        }
    );

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

    for (
        const [specialName, special]
        of specials
    ) {
        const perkCard =
            document.createElement("article");

        perkCard.classList.add(
            "perk-card"
        );

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
        perksList.querySelectorAll(
            ".perk-card"
        );

    for (const perkCard of perkCards) {
        perkCard.classList.remove(
            "perk-unlocked",
            "perk-locked"
        );

        if (!selectedMinimumStars) {
            continue;
        }

        const requiredStars =
            Number(
                perkCard.dataset.ratingRequired
            );

        if (
            requiredStars
            <= selectedMinimumStars
        ) {
            perkCard.classList.add(
                "perk-unlocked"
            );
        } else {
            perkCard.classList.add(
                "perk-locked"
            );
        }
    }
}


function updateSearchButtonState() {
    const hasApiKey =
        Boolean(activeApiKey);

    const hasCompanyType =
        Boolean(companyTypeSelect.value);

    const hasMinimumStars =
        Boolean(minimumStarsSelect.value);

    searchButton.disabled = !(
        hasApiKey
        && hasCompanyType
        && hasMinimumStars
    );
}


async function searchForVacancies() {
    const companyTypeId =
        companyTypeSelect.value;

    const minimumStars =
        Number(minimumStarsSelect.value);

    if (
        !activeApiKey
        || !companyTypeId
        || !minimumStars
    ) {
        updateSearchButtonState();
        return;
    }

    resetSearchResults();

    resultsSection.hidden = false;

    resultsStatusElement.textContent =
        "Loading companies...";

    searchButton.disabled = true;
    companyTypeSelect.disabled = true;
    minimumStarsSelect.disabled = true;

    try {
        const allCompanies =
            await loadAllCompanies(
                companyTypeId,
                activeApiKey
            );

        const matchingCompanies =
            findCompaniesWithVacancies(
                allCompanies,
                minimumStars
            );

        displayVacancyResults(
            matchingCompanies,
            allCompanies.length
        );
    } catch (error) {
        console.error(error);

        resultsStatusElement.textContent =
            `Search failed: ${error.message}`;
    } finally {
        companyTypeSelect.disabled = false;
        minimumStarsSelect.disabled = false;

        updateSearchButtonState();
    }
}


async function loadAllCompanies(
    companyTypeId,
    apiKey
) {
    const pageSize = 100;
    const maximumPages = 100;

    let offset = 0;
    let totalCompanies = null;
    let loadedPages = 0;

    const allCompanies = [];

    while (loadedPages < maximumPages) {
        const requestUrl = new URL(
            `https://api.torn.com/v2/company/${companyTypeId}/companies`
        );

        requestUrl.searchParams.set(
            "limit",
            pageSize
        );

        requestUrl.searchParams.set(
            "offset",
            offset
        );

        const response = await fetch(
            requestUrl,
            {
                headers: {
                    Authorization: `ApiKey ${apiKey}`
                }
            }
        );

        const data =
            await response.json();

        if (!response.ok || data.error) {
            throw new Error(
                data.error?.error
                ?? "Could not load company vacancies."
            );
        }

        if (!Array.isArray(data.companies)) {
            throw new Error(
                "Torn returned an unexpected company response."
            );
        }

        const currentPage =
            data.companies;

        allCompanies.push(
            ...currentPage
        );

        loadedPages += 1;

        const metadataTotal =
            Number(data._metadata?.total);

        if (
            totalCompanies === null
            && Number.isFinite(metadataTotal)
        ) {
            totalCompanies =
                metadataTotal;
        }

        if (totalCompanies !== null) {
            const loadedCount =
                Math.min(
                    allCompanies.length,
                    totalCompanies
                );

            resultsStatusElement.textContent =
                `Loading companies: ${loadedCount} of ${totalCompanies}...`;
        } else {
            resultsStatusElement.textContent =
                `Loading companies: ${allCompanies.length} loaded...`;
        }

        const reachedLastPage =
            currentPage.length < pageSize;

        const reachedKnownTotal =
            totalCompanies !== null
            && allCompanies.length
            >= totalCompanies;

        if (
            currentPage.length === 0
            || reachedLastPage
            || reachedKnownTotal
        ) {
            return allCompanies;
        }

        offset += pageSize;
    }

    throw new Error(
        "Company search stopped because too many pages were returned."
    );
}


function findCompaniesWithVacancies(
    companies,
    minimumStars
) {
    return companies
        .map((company) => {
            const employeesHired =
                Number(
                    company.employees?.hired
                    ?? 0
                );

            const employeeCapacity =
                Number(
                    company.employees?.capacity
                    ?? 0
                );

            const rating =
                Number(company.rating ?? 0);

            const vacancies =
                employeeCapacity
                - employeesHired;

            return {
                ...company,
                rating,
                employeesHired,
                employeeCapacity,
                vacancies
            };
        })
        .filter((company) => {
            return company.rating
                >= minimumStars
                && company.vacancies > 0;
        })
        .sort(
            (firstCompany, secondCompany) => {
                const ratingDifference =
                    secondCompany.rating
                    - firstCompany.rating;

                if (ratingDifference !== 0) {
                    return ratingDifference;
                }

                const vacancyDifference =
                    secondCompany.vacancies
                    - firstCompany.vacancies;

                if (vacancyDifference !== 0) {
                    return vacancyDifference;
                }

                return firstCompany.name.localeCompare(
                    secondCompany.name
                );
            }
        );
}


function displayVacancyResults(
    companies,
    totalCompaniesScanned
) {
    resultsList.replaceChildren();

    if (companies.length === 0) {
        resultsStatusElement.textContent =
            `No matching vacancies found among ${totalCompaniesScanned} companies.`;

        return;
    }

    const companyWord =
        companies.length === 1
            ? "company"
            : "companies";

    resultsStatusElement.textContent =
        `${companies.length} matching ${companyWord} found from ${totalCompaniesScanned} scanned.`;

    for (const company of companies) {
        const resultCard =
            document.createElement("article");

        resultCard.classList.add(
            "result-card"
        );

        const companyName =
            document.createElement("h4");

        companyName.textContent =
            `${company.rating}★ — ${company.name}`;

        const employeeCount =
            document.createElement("p");

        employeeCount.textContent =
            `Employees: ${company.employeesHired} / ${company.employeeCapacity}`;

        const vacancyCount =
            document.createElement("p");

        const vacancyWord =
            company.vacancies === 1
                ? "vacancy"
                : "vacancies";

        vacancyCount.textContent =
            `${company.vacancies} ${vacancyWord}`;

        const applicationStatus =
            document.createElement("p");

        if (
            company.applications_allowed
            === true
        ) {
            applicationStatus.textContent =
                "Applications: Allowed";
        } else if (
            company.applications_allowed
            === false
        ) {
            applicationStatus.textContent =
                "Applications: Currently closed";

            applicationStatus.classList.add(
                "applications-closed"
            );
        } else {
            applicationStatus.textContent =
                "Applications: Status unavailable";
        }

        const directorInformation =
            document.createElement("p");

        const directorName =
            company.director?.name
            ?? "Unknown";

        const directorActivity =
            company.director
                ?.last_action
                ?.relative
            ?? "Unknown";

        directorInformation.textContent =
            `Director: ${directorName} — last active ${directorActivity}`;

        const companyLink =
            document.createElement("a");

        companyLink.href =
            `https://www.torn.com/joblist.php#/p=corpinfo&ID=${encodeURIComponent(company.id)}`;

        companyLink.target = "_blank";
        companyLink.rel = "noopener noreferrer";
        companyLink.textContent =
            "View company in Torn";

        companyLink.classList.add(
            "company-link"
        );

        resultCard.append(
            companyName,
            employeeCount,
            vacancyCount,
            applicationStatus,
            directorInformation,
            companyLink
        );

        resultsList.append(resultCard);
    }
}
function resetFinderInterface() {
    companyDefinitions = {};

    companyTypeSelect.replaceChildren(
        createCompanyPlaceholderOption()
    );

    companyTypeSelect.disabled = false;

    minimumStarsSelect.value = "";
    minimumStarsSelect.disabled = true;

    searchButton.disabled = true;

    finderStatusElement.textContent = "";

    perksSection.hidden = true;
    perksTitle.textContent =
        "Company perks";

    perksList.replaceChildren();

    resetSearchResults();
}


function resetSearchResults() {
    resultsSection.hidden = true;
    resultsStatusElement.textContent = "";
    resultsList.replaceChildren();
}