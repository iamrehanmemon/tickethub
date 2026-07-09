//  <script>
//   const typeConfig = [
//     {
//       key: "request",
//       label: "Request",
//       cards: [
//         { id: "procurement-request", title: "Procurement Request", desc: "Request procurement needs all in one place.", btnText: "Submit Request", btnClass: "btn-primary" },
//         { id: "consignee-support", title: "Consignee Support", desc: "Consignee Support", btnText: "Submit Request", btnClass: "btn-primary" },
//         { id: "customer-onboarding", title: "Customer Onboarding", desc: "Request for Onboarding a new Customer.", btnText: "Submit Request", btnClass: "btn-primary" }

//       ]
//     }
//     //,
//     // {
//     //   key: "incident",
//     //   label: "Incident",
//     //   cards: [
//     //     { id: "system-outage", title: "System Outage", desc: "Report system downtime or access failures.", btnText: "Report Incident", btnClass: "btn-danger" },
//     //     { id: "security-issue", title: "Security Issue", desc: "Flag a security vulnerability or potential risk.", btnText: "Report Incident", btnClass: "btn-danger" }
//     //   ]
//     // },
//     // {
//     //   key: "complaint",
//     //   label: "Complaint",
//     //   cards: [
//     //     { id: "delay", title: "Delay تأخير", desc: "Delay related to Delivery of Shipments.", btnText: "Lodge Complaint", btnClass: "btn-warning" },
//     //     { id: "wrong-ndr", title: "Wrong NDR سبب غير صحيح", desc: "Something wrong with the Wrong NDR.", btnText: "Lodge Complaint", btnClass: "btn-warning" }
//     //   ]
//     // }
//   ];


//   function populateDropdown() {
//     const dropdown = document.getElementById('typeDropdown');
//     dropdown.innerHTML = typeConfig.map(
//       t => `<option value="${t.key}">${t.label}</option>`
//     ).join("");
//   }

//   function renderCards(typeKey) {
//     const cardsRow = document.getElementById('cardsRow');
//     const group = typeConfig.find(cfg => cfg.key === typeKey);
//     if (!group) return (cardsRow.innerHTML = "");

//     // cardsRow.innerHTML = group.cards.map(card =>
//     //   `<div class="col card-group">
//     //     <div class="card h-100">
//     //       <div class="card-body d-flex flex-column">
//     //         <h4 class="card-title">${card.title}</h4>
//     //         <p class="card-subtitle mb-2 text-muted">${card.desc}</p>
//     //         <button type="button" class="btn mt-auto ${card.btnClass} card-action-btn" data-card-id="${card.id}">
//     //           ${card.btnText}
//     //         </button>
//     //       </div>
//     //     </div>
//     //   </div>`
//     // ).join("");

//     cardsRow.innerHTML = group.cards.map(card =>
//   `<div class="col-md-4" data-aos="fade-up">
//       <div class="service-card h-100 d-flex flex-column">

//           <h4 class="mb-2">${card.title}</h4>
//           <p class="text-secondary card-desc">${card.desc}</p>

//           <button 
//             type="button" 
//             class="btn btn-secondary card-action-btn mt-auto w-100" 
//             data-card-id="${card.id}">
//               ${card.btnText}
//           </button>

//       </div>
//   </div>`
// ).join("");

//     // Attach event listeners for card buttons
//     document.querySelectorAll('.card-action-btn').forEach(btn => {
//       btn.addEventListener('click', function () {
//         const cardId = this.getAttribute('data-card-id');
//         window.location.href = `/Submit-Ticket?formname=${encodeURIComponent(cardId)}`; // Redirects with formname in URL
//       });
//     });
//   }

//   document.addEventListener("DOMContentLoaded", () => {
//     populateDropdown();
//     renderCards(typeConfig[0].key);

//     document.getElementById('typeDropdown').addEventListener('change', e => {
//       renderCards(e.target.value);
//     });
//   });
// </script>