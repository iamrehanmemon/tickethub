document.addEventListener("DOMContentLoaded", function () {

    const timestamp = new Date().toISOString();
    const apiUrl = "/_api/sh_tickets?$select=sh_ticketid&$filter=sh_title eq 'Test Record for page refresh'";

    // ✅ Fetch token from the dedicated Power Pages token endpoint
    fetch("/_layout/tokenhtml")
        .then(res => res.text())
        .then(html => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");
            const token = doc.querySelector('input[name="__RequestVerificationToken"]')?.value;

            if (!token) {
                console.error("Token still not found — is the user authenticated?");
                return;
            }

            // console.log("Token found:", token.substring(0, 20) + "...");

            // Step 1: Find the record
            return fetch(apiUrl, {
                method: "GET",
                headers: {
                    "Accept": "application/json",
                    "__RequestVerificationToken": token
                }
            })
            .then(response => {
                if (!response.ok) throw new Error(`GET failed: ${response.status}`);
                return response.json();
            })
            .then(data => {
                if (!data.value || data.value.length === 0) {
                    console.warn("No matching record found.");
                    return;
                }

                const recordId = data.value[0].sh_ticketid;

                // Step 2: Update the record
                return fetch(`/_api/sh_tickets(${recordId})`, {
                    method: "PATCH",
                    headers: {
                        "Accept": "application/json",
                        "Content-Type": "application/json",
                        "__RequestVerificationToken": token
                    },
                    body: JSON.stringify({
                        sh_description: `Page refreshed at ${timestamp}`
                    })
                });
            })
            .then(response => {
                if (response && !response.ok) throw new Error(`PATCH failed: ${response.status}`);
                console.log("Record updated successfully.");
            });
        })
        .catch(error => console.error("Error:", error));
});



// Not used anymore, can be removed

// document.addEventListener("DOMContentLoaded", function () {

//     // Format timestamp
//     const timestamp = new Date().toISOString();

//     // Web API URL (Dataverse table logical name)
//     const apiUrl = "/_api/sh_tickets?$select=sh_ticketid&$filter=sh_title eq 'Test Record for page refresh'";

//     // Step 1: Find the record
//     fetch(apiUrl, {
//         method: "GET",
//         headers: {
//             "Accept": "application/json"
//         }
//     })
//     .then(response => response.json())
//     .then(data => {
//         if (data.value.length === 0) {
//             console.warn("No matching record found.");
//             return;
//         }

//         const recordId = data.value[0].sh_ticketid;

//         // Step 2: Update description with timestamp
//         return fetch(`/_api/sh_tickets(${recordId})`, {
//             method: "PATCH",
//             headers: {
//                 "Accept": "application/json",
//                 "Content-Type": "application/json"
//             },
//             body: JSON.stringify({
//                 sh_description: `Page refreshed at ${timestamp}`
//             })
//         });
//     })
//     // .then(() => {
//     //     console.log("Dummy record updated successfully.");
//     // })
//     // .catch(error => {
//     //     console.error("Error updating record:", error);
//     // });

// });