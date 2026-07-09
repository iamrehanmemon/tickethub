document.addEventListener("DOMContentLoaded", function () {

  const handleButtons = setInterval(function () {

    $('td[data-th="Action"]').each(function () {

      const $td = $(this);

      // Prevent duplicate buttons
      if ($td.find("button.view-ticket-btn").length) return;

      // Try to get lookup value from same row
      const rawLookup = $td
        .closest("tr")
        .find('td[data-attribute="sh_ticketnumber"]')
        .attr("data-value");

      let ticketGuid = null;

      if (rawLookup) {
        const guidRegex = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;
        const match = rawLookup.match(guidRegex);
        if (match) ticketGuid = match[0];
      }

      // Create button
      const button = $(`
        <button type="button" class="btn btn-primary btn-sm view-ticket-btn">
          View
        </button>
      `);

      if (ticketGuid) {
        const redirectUrl = `/View-Ticket/?id=${encodeURIComponent(ticketGuid)}`;

        button.on("click", function () {
          window.location.href = redirectUrl;
        });

      } else {
        // Handle missing GUID (optional behavior)
        button.prop("disabled", true);
        button.text("No Ticket");
      }

      // Append instead of replace (safer)
      $td.empty().append(button);

    });

  }, 200);

});