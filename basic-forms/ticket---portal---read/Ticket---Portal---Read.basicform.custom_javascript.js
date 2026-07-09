// document.addEventListener("DOMContentLoaded", function () {
//     const handlePath = setInterval(function () {
//         $('td[data-attribute="sh_attachmentpath"]').each(function () {
//             const $td = $(this);
//             const filePath = $td.attr("data-value");

//             // Only convert if filePath exists and dropdown isn't already added
//             if (filePath && !$td.find('.dropdown').length) {
//                 const dropdown = $(`
//                     <div class="dropdown">
//                         <button class="btn btn-primary btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
//                             Select
//                         </button>
//                         <ul class="dropdown-menu">
//                             <li><a class="dropdown-item doc-action-item" href="${filePath}" data-action="view">View</a></li>
//                             <li><a class="dropdown-item doc-action-item" href="${filePath}" data-action="download">Download</a></li>
//                             <li><a class="dropdown-item doc-action-item" href="${filePath}" data-action="print">Print</a></li>
//                         </ul>
//                     </div>
//                 `);

//                 // Store file path on the parent td so it can be retrieved on action
//                 dropdown.attr("data-filepath", filePath);

//                 $td.html(dropdown);
//             }
//         });
//     }, 100);
// });


document.addEventListener("DOMContentLoaded", function () {
    const pathSelector = 'td[data-attribute="sh_attachmentpath"]';
    const interval = setInterval(function () {
        document.querySelectorAll(pathSelector).forEach(td => {
            const filePath = td.getAttribute("data-value");
            if (!filePath || td.querySelector('.dropdown')) return;

            // Efficiently check for .pdf extension (case-insensitive)
            const isPDF = filePath.toLowerCase().endsWith('.pdf');
            const actions = isPDF
                ? [
                    { label: "View", action: "view" },
                    { label: "Download", action: "download" },
                    { label: "Print", action: "print" }
                ]
                : [
                    { label: "Download", action: "download" }
                ];

            // Construct dropdown menu
            const dropdownHTML = `
                <div class="dropdown" data-filepath="${filePath}">
                    <button class="btn btn-${isPDF ? 'primary' : 'secondary'} btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                        Select
                    </button>
                    <ul class="dropdown-menu">
                        ${actions.map(a => `<li><a class="dropdown-item doc-action-item" href="${filePath}" data-action="${a.action}">${a.label}</a></li>`).join('')}
                    </ul>
                </div>
            `;

            // Replace innerHTML only once
            td.innerHTML = dropdownHTML;
        });

        // Optional: Clear interval when done (example: after 5 seconds)
        // clearInterval(interval);
    }, 100);
});