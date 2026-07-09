// let assignedToFilterAlreadyApplied = false;

// async function applyAssignedToFilter() {
//   const filterIndex = 0;
//   if (assignedToFilterAlreadyApplied) return;
  
//   console.log("assignedtorunning");
//   if ($("#dropdown_" + filterIndex).length) return;

//   assignedToFilterAlreadyApplied = true;
 
//   showLoader("Loading Assigned To filter…");
 
//   $(`.entitylist-filter-option-group-label[data-filter-id="${filterIndex}"]`)
//     .text("Assigned To");
 
//   const response = await fetch(
//     "/_api/systemusers?$select=systemuserid,fullname,internalemailaddress" +
//     "&$filter=internalemailaddress eq '" + loggedInEmail + "'"
//   );
 
//   if (!response.ok) {
//     hideLoader();
//     return;
//   }
 
//   const users = (await response.json()).value || [];
//   let systemUserGuid = "{00000000-0000-0000-0000-000000000000}";
//   let displayName = "No Records";

//   // if (!users.length) {
//   //   hideLoader();
//   //   return;
//   // }

//   if (users.length) {
//     const user = users[0];
//     systemUserGuid = `{${user.systemuserid}}`;
//     displayName = user.fullname || user.internalemailaddress;
//   }

//   //const user = users[0];
//   //const systemUserGuid = `{${user.systemuserid}}`;

//   const dropdown = $(`
//     <select class="form-control" name="${filterIndex}" id="dropdown_${filterIndex}">
//       <option value="${systemUserGuid}" selected>
//         ${displayName}
//       </option>
//     </select>
//   `);
 
//   const label = $(`.entitylist-filter-option-group-label[data-filter-id="${filterIndex}"]`);
 
//   label.siblings("ul").replaceWith(`
//     <div class="input-group entitylist-filter-option-text">
//       <span class="input-group-addon">
//         <span class="fa fa-filter"></span>
//       </span>
//     </div>
//   `);
 
//   label.siblings(".input-group").append(dropdown);
 
//   setTimeout(() => {
//     $(".btn-entitylist-filter-submit").trigger("click");
//      hideLoader(); // ← ADD THIS (matches Prod)
//   }, 300);
// }
 
// $(document).on("loaded", ".entitylist.entity-grid", function () {
//   applyAssignedToFilter();
// });

// $(document).on("loaded", ".entitylist.entity-grid", function () {
//     // if (!assignedToFilterAlreadyApplied) {
//     //   applyAssignedToFilter();
//     //   //return;
//     // }
//     showLoader("Loading...");
//     applySLABadges();
//     hideLoader();

// });