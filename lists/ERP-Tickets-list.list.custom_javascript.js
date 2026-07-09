document.addEventListener("DOMContentLoaded", function () {

  const handleButtons = setInterval(function () {

    $('td[data-attribute="sh_itid"]').each(function () {

      const $td = $(this);

      // Grab the lookup "value" from sh_ticketnumber column (same row)
      const rawLookup = $td
        .closest("tr")
        .find('td[data-attribute="sh_ticketnumber"]')
        .attr("data-value");

      if (!rawLookup) return;

      // Extract GUID safely
      let ticketGuid = null;

      // Case 1: it's already a GUID
      const guidRegex = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;
      const guidMatch = rawLookup.match(guidRegex);
      if (guidMatch) ticketGuid = guidMatch[0];

      // Only add button once
      if (ticketGuid && !$td.find("button.view-ticket-btn").length) {

        const redirectUrl = `/View-Ticket/?id=${encodeURIComponent(ticketGuid)}`;

        const button = $(`
          <button type="button" class="btn btn-primary btn-sm view-ticket-btn">
            View
          </button>
        `);

        button.on("click", function () {
          window.location.href = redirectUrl;
        });

        $td.html(button);
      }

    });

  }, 200);

});