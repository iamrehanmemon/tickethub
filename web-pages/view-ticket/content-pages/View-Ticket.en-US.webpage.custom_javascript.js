let dropdownConfigCache = {}; // cache grouped by dropdown type
let allDropdownData = []; // all dropdown records
let attachmentIndex = 0;
let currentAttachmentType = "";
let systemInfoIndex = 0;
/* ================================
   🔹 Loader Overlay Controls
================================ */

function showLoader(message = "Processing…") {
  const loader = document.getElementById("loaderOverlay");
  const loaderMsg = document.getElementById("loaderMessage");

  if (loaderMsg) loaderMsg.textContent = message; // set dynamic message
  loader.classList.remove("d-none");
  loader.classList.add("d-flex");
}

function hideLoader() {
  const loader = document.getElementById("loaderOverlay");
  loader.classList.remove("d-flex");
  loader.classList.add("d-none");
}

function setupCategoryToggle_ViewTicket() {
  const category = document.getElementById("sh_category");
  const mobileDiv = document.getElementById("newMobileNumberSection");
  const addressDiv = document.getElementById("newAddressSection");

  if (!category) return;

  // Get selected text inside the <select>
  const selectedOption = category.options?.[category.selectedIndex];
  const text = selectedOption?.text?.trim() || "";

  console.log("Category (View Mode):", text);

  // Hide both sections first
  mobileDiv?.classList.add("d-none");
  addressDiv?.classList.add("d-none");

  if (!text) return;

  if (
    text.includes("Address & Phone number updated") ||
    text.includes("تحديث العنوان ورقم التواصل")
  ) {
    mobileDiv?.classList.remove("d-none");
    addressDiv?.classList.remove("d-none");
  }
  else if (
    text.includes("Mobile Updated") ||
    text.includes("تم تحديث الجوال")
  ) {
    mobileDiv?.classList.remove("d-none");
  }
  else if (
    text.includes("Address Updated") ||
    text.includes("تم تحديث العنوان")
  ) {
    addressDiv?.classList.remove("d-none");
  }
}

const multiSelectConfig = {
  productTypes: {
    listId: "productTypesList",
    buttonId: "productTypesBtn",
    type: "productTypes"
  },
  businessScope: {
    listId: "businessScopeList",
    buttonId: "businessScopeBtn",
    type: "businessScope"
  },
  procurementSubCategory: {
    listId: "procurementSubCategoryList",
    buttonId: "procurementSubCategoryBtn",
    type: "procurementSubCategory"
  },
  warehouseAllocation: {
    listId: "warehouseAllocationList",
    buttonId: "warehouseAllocationBtn",
    type: "warehouseAllocations"
  },
  integrationScope: {
    listId: "integrationScopeList",
    buttonId: "integrationScopeBtn",
    type: "integrationScope"
  },
  proofDelivery: {
    listId: "proofDeliveryList",
    buttonId: "proofDeliveryBtn",
    type: "deliveryProof"
  }
};

function loadMultiSelect() {
    Object.keys(multiSelectConfig).forEach(key => {
        const cfg = multiSelectConfig[key];
        const list = document.getElementById(cfg.listId);

        if (!list) return;

        list.innerHTML = "";

        // 👇 Inject search input as first item
        list.insertAdjacentHTML("beforeend", `
            <li class="px-1 pb-1">
                <input type="text" class="form-control form-control-sm" 
                       placeholder="Search..."
                       oninput="filterDropdown('${cfg.listId}', this.value)"
                       onclick="event.stopPropagation()">
            </li>
        `);

        const options = dropdownConfigCache[cfg.type] || [];

        options.forEach((opt, idx) => {
            const text = opt.text;
            const id = `${key}_${idx}`;

            list.insertAdjacentHTML("beforeend", `
                <li>
                    <div class="form-check">
                        <input class="form-check-input dd-check"
                               type="checkbox"
                               value="${text}"
                               id="${id}">
                        <label class="form-check-label" for="${id}">
                            ${text}
                        </label>
                    </div>
                </li>
            `);
        });
    });
}

function filterDropdown(listId, query) {
  const list = document.getElementById(listId);
  const q = query.toLowerCase().trim();
  [...list.querySelectorAll("li")].slice(1).forEach(li => {
    const label = li.querySelector("label");
    const text = (label?.textContent || "").toLowerCase();
    li.style.display = (!q || text.includes(q)) ? "" : "none";
  });
}

function parseMultiChoiceRaw(raw) {
  if (!raw) return [];

  // Normalize common separators: semicolon, comma, newline
  return String(raw)
    .split(/;|,|\n/)
    .map(s => s.trim())
    .filter(Boolean);
}

/**
 * Reads the existing Dataverse multi-choice values from the page.
 * Works for:
 *  - <select multiple>
 *  - input/textarea read-only text
 */
function getDataverseMultiChoiceLabels(fieldId) {
  const el = document.getElementById(fieldId);
  if (!el) return [];

  // Case 1: select multiple
  if (el.tagName === "SELECT") {
    const selected = Array.from(el.selectedOptions || []);
    // Prefer labels (text), because your checkbox values are labels
    return selected.map(o => (o.textContent || "").trim()).filter(Boolean);
  }

  // Case 2: input/textarea (read-only display)
  if ("value" in el) {
    return parseMultiChoiceRaw(el.value);
  }

  // Fallback: sometimes value is rendered as textContent
  return parseMultiChoiceRaw(el.textContent);
}

/**
 * Applies selected labels to your custom checkbox list.
 * listId is like: "productTypesList"
 */
function applySelectionsToCheckboxList(listId, selectedLabels) {
  const list = document.getElementById(listId);
  if (!list) {
    console.warn("❌ List not found:", listId);
    return;
  };

  const values = selectedLabels
    .split(";")
    .map(v => v.trim().toLowerCase())
    .filter(Boolean);

  //const set = new Set((selectedLabels || []).map(v => v.trim()));
  const set = new Set(values);

  list.querySelectorAll('input.dd-check[type="checkbox"]').forEach(cb => {
    // const label = (cb.value || "").trim();
    // cb.checked = set.has(label);
    cb.checked = set.has(cb.value.trim().toLowerCase());
  });
}

/**
 * Convenience wrapper:
 * - Reads Dataverse field values
 * - Applies them to your custom list
 */
function loadMultiSelectSelections(dataverseFieldId, listId) {
  const labels = getDataverseMultiChoiceLabels(dataverseFieldId);
  applySelectionsToCheckboxList(listId, labels);
}

function setDropdownButtonText(buttonId, hiddenInputId, fallbackText) {
  const btn = document.getElementById(buttonId);
  const hidden = document.getElementById(hiddenInputId);
  if (!btn || !hidden) return;

  btn.textContent = hidden.value || fallbackText;
}

/* ================================
   🔹 Fetch Currencies
================================ */
async function getCurrencies(dropdownId, message = "Fetching currencies...") {
  showLoader(message);
  try {
    const res = await fetch("/_api/transactioncurrencies?$select=transactioncurrencyid,currencyname,isocurrencycode");
    const data = await res.json();

    const dropdown = document.getElementById(dropdownId);
    dropdown.innerHTML = '<option value="">Select Currency</option>';

    data.value.forEach(item => {
      const opt = document.createElement("option");
      opt.value = item.transactioncurrencyid;
      opt.textContent = `${item.currencyname} (${item.isocurrencycode})`;
      dropdown.appendChild(opt);
    });
  } catch (e) {
    console.error("Error fetching currencies:", e);
  } finally {
    hideLoader();
  }
}

/* ================================
   🔹 Fetch All Dropdown Configurations Once
================================ */
async function loadAllDropdownConfigs(message = "Loading dropdowns...") {
  showLoader(message);
  try {
    const res = await fetch("/_api/sh_dropdownconfigurations?$select=sh_dropdownconfigurationid,sh_value,sh_dropdown&$orderby=sh_value asc");
    const data = await res.json();

    if (data.value && data.value.length) {
      allDropdownData = data.value;

      // Group results by dropdown type for fast lookup
      dropdownConfigCache = data.value.reduce((acc, item) => {
        const type = item.sh_dropdown;
        if (!acc[type]) acc[type] = [];
        acc[type].push({
          id: item.sh_dropdownconfigurationid,
          text: item.sh_value
        });
        return acc;
      }, {});
    }
  } catch (e) {
    console.error("Error loading dropdown configurations:", e);
  } finally {
    hideLoader();
  }
}

async function loadOptionSet(entity, attribute, selector, selectedValue = null) {

  const dropdown = document.querySelector(selector);
  if (!dropdown) return;

  dropdown.innerHTML = ""; // remove Liquid option

  const res = await fetch(
    `/api/data/v9.2/EntityDefinitions(LogicalName='${entity}')/Attributes(LogicalName='${attribute}')/Microsoft.Dynamics.CRM.PicklistAttributeMetadata?$expand=OptionSet`
  );

  const metadata = await res.json();

  dropdown.add(new Option("-- Select --", ""));

  metadata.OptionSet.Options.forEach(opt => {
    const label = opt.Label?.UserLocalizedLabel?.Label;
    const value = opt.Value;

    const option = new Option(label, value);
    if (selectedValue == value) option.selected = true;

    dropdown.add(option);
  });
}

/* ================================
   Attachments
================================ */

function addAttachmentField(attachmentType) {
  const container = document.getElementById('attachmentFields');
  const newSelectId = `attachmentType_${attachmentIndex}`;

  const html = `
    <div class="row mb-2" id="file-row-${attachmentIndex}">
      <div class="col-md-5">
        <select class="form-select" id="${newSelectId}" name="${newSelectId}" required>
          <option value="">Select</option>
        </select>
      </div>
      <div class="col-md-6">
        <input class="form-control" type="file" name="attachmentFile_${attachmentIndex}" required>
      </div>
      <div class="col-md-1">
        <button type="button" class="btn btn-danger" onclick="removeAttachmentField(${attachmentIndex})">&times;</button>
      </div>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', html);

  // Populate dropdown from cache (no new fetch)
  //populateDropdown(newSelectId, "attachmentsTypeProcurementRequest");
  populateDropdown(newSelectId, attachmentType);

  attachmentIndex++;
}

function removeAttachmentField(idx) {
  document.getElementById(`file-row-${idx}`).remove();
}

/* ================================
   🔹 Populate Dropdown & Checkboxes from Cache
================================ */
function populateDropdown(dropdownId, dropdownType, preselectedValue = null) {
  const select = document.getElementById(dropdownId);
  if (!select) return;

  const selectedText = preselectedValue
    || select.options[select.selectedIndex]?.textContent?.trim()
    || "";

  const selectedValue = select.value || "";

  select.innerHTML = '<option value="">Select</option>';

  const options = dropdownConfigCache[dropdownType] || [];

  options.forEach(opt => {
    const option = document.createElement("option");
    option.value = opt.id;
    option.textContent = opt.text;

    const optText = (opt.text || "").trim().toLowerCase();
    const savedText = (selectedText || "").trim().toLowerCase();

    if (
      opt.id === selectedValue ||
      optText === savedText
    ) {
      option.selected = true;
    }

    select.appendChild(option);
  });

  console.log(`Dropdown populated: ${dropdownId}`, {
    dropdownType,
    selectedText,
    selectedValue,
    finalValue: select.value,
    finalText: select.options[select.selectedIndex]?.textContent
  });
}

function showTicketStatusModal({ success, ticketId = null, message = "" }) {
  const modalEl = document.getElementById('ticketStatusModal');
  const iconEl = document.getElementById('ticketStatusIcon');
  const headingEl = document.getElementById('ticketStatusHeading');
  const modal = new bootstrap.Modal(modalEl);

  if (success) {
    iconEl.className = "bi bi-check-circle-fill text-success";
    headingEl.textContent = `Ticket #${ticketId} Submitted Successfully!`;
  } else {
    iconEl.className = "bi bi-x-circle-fill text-danger";
    headingEl.textContent = message || "Ticket Submission Failed!";
  }

  modal.show();

  // Auto-close modal after 5 seconds
  setTimeout(() => {
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    if (modalInstance) modalInstance.hide();
  }, 5000);

  // Redirect after modal is completely hidden
  modalEl.addEventListener('hidden.bs.modal', () => {
    if (success) {
      // ✅ Redirect to Track Ticket page (customize URL if needed)
      window.location.href = `/Track-Ticket/`;
    }
  }, { once: true }); // runs only once per modal show
}

// Start for Integration Info Functions
function prepopulateSystemInfo() {
  const el = document.getElementById("systemInfoJson");
  if (!el || !el.value) return;

  let data;
  try {
    data = JSON.parse(el.value);
  } catch (e) {
    console.error("Invalid system info JSON", el.value);
    return;
  }

  if (!Array.isArray(data)) return;

  data.forEach(item => {
    addSystemInfoRow(item);
  });
}

function addSystemInfoRow(prefill) {
  const container = document.getElementById("systemInfoFields");
  if (!container) return;

  const idx = systemInfoIndex++;

  const rowId = `systemInfoRow_${idx}`;

  container.insertAdjacentHTML("beforeend", `
    <div class="row mb-2" id="${rowId}">
      <div class="col-md-3">
        <select class="form-select" id="system_${idx}"></select>
      </div>
      <div class="col-md-3">
        <select class="form-select" id="type_${idx}"></select>
      </div>
      <div class="col-md-2">
        <input class="form-control" id="key_${idx}">
      </div>
      <div class="col-md-3">
        <input class="form-control" id="value_${idx}">
      </div>
      <div class="col-md-1">
        <button type="button" class="btn btn-danger" onclick="removeSystemInfoRow('${rowId}')">&times;</button>
      </div>
    </div>
  `);

  populateDropdown(`system_${idx}`, "systemType");
  populateDropdown(`type_${idx}`, "integrationSystemTypes");

  if (prefill) {
    document.getElementById(`key_${idx}`).value = prefill.key || "";
    document.getElementById(`value_${idx}`).value = prefill.value || "";

    // select by label
    setTimeout(() => {
      selectByText(`system_${idx}`, prefill.system);
      selectByText(`type_${idx}`, prefill.type);
    }, 100);
  }
}

function selectByText(selectId, text) {
  const ddl = document.getElementById(selectId);
  if (!ddl || !text) return;

  [...ddl.options].forEach(opt => {
    if (opt.text === text) ddl.value = opt.value;
  });
}

function removeSystemInfoRow(rowId) {
  document.getElementById(rowId)?.remove();
}
// End for Integration Info Functions



document.addEventListener("DOMContentLoaded", async function () {

  //Add Integration Info Button Code
  const addBtn = document.getElementById("addSystemInfoBtn");
  if (addBtn) {
    addBtn.addEventListener("click", () => {
      addSystemInfoRow(); // empty row
    });
  }

  currentAttachmentType = "defaultAttachment";
      console.log(currentAttachmentType);

  setupCategoryToggle_ViewTicket();

  await loadAllDropdownConfigs();

  if (requestType === 'HR Request') {
    currentAttachmentType = "defaultAttachment";
    populateDropdown('attachmentType', currentAttachmentType);
    addAttachmentField(currentAttachmentType);
  }

  if (requestType === 'Vendor Selection') {
    currentAttachmentType = "attachmentsTypeProcurementRequest";
    loadMultiSelect();
    setDropdownButtonText("procurementSubCategoryBtn", "procurementSubCategorylabel", "Select Procurement Sub Category");
  }

  if (requestType === 'PO Creation') {
    currentAttachmentType = "attachmentsTypeProcurementRequest";
    // console.log(currentAttachmentType);
    populateDropdown('attachmentType', currentAttachmentType);
    
    loadMultiSelect();
    setDropdownButtonText("procurementSubCategoryBtn", "procurementSubCategorylabel", "Select Procurement Sub Category");
  }

  if (requestType === 'GRN Entry') {
    currentAttachmentType = "attachmentsTypeProcurementRequest";
    // console.log(currentAttachmentType);
    populateDropdown('attachmentType', currentAttachmentType);
    addAttachmentField(currentAttachmentType);
  }

  if (requestType === 'Legal Request') {
    currentAttachmentType = "legalAttachmentTypes";
    // console.log(currentAttachmentType);
    populateDropdown('attachmentType', currentAttachmentType);
    addAttachmentField(currentAttachmentType);
  }

 if (requestType === 'Customer Onboarding' || requestType === 'Tech Account Creation' || requestType === 'Account Manager Assignment') {
    currentAttachmentType = "defaultAttachment";
    populateDropdown('attachmentType', currentAttachmentType);
    addAttachmentField(currentAttachmentType);
    loadMultiSelect(); // builds checkbox lists :contentReference[oaicite:5]{index=5}
    // ✅ Apply saved selections from Dataverse multi-choice columns:
    //applySelectionsToCheckboxList("productTypesList",document.getElementById("pt_labels").value);
    setDropdownButtonText("productTypesBtn", "pt_labels", "Select Product Types");
    setDropdownButtonText("proofDeliveryBtn", "pod_labels", "Select POD Options");
    setDropdownButtonText("integrationScopeBtn", "is_labels", "Select Integration Scope");
    setDropdownButtonText("businessScopeBtn", "bs_labels", "Select Business Scope");
    setDropdownButtonText("warehouseAllocationBtn", "wa_labels", "Select Warehouse Allocations");
    prepopulateSystemInfo();
    // loadMultiSelectSelections("sh_producttypes", "productTypesList");
    // loadMultiSelectSelections("sh_businessscope", "businessScopeList");
    // loadMultiSelectSelections("sh_warehouseallocation", "warehouseAllocationList");
    // loadMultiSelectSelections("sh_integrationscope", "integrationScopeList");
    // loadMultiSelectSelections("sh_proofdelivery", "proofDeliveryList");
  }


});

// Add System info section for Tech Department
// window.onload = function () {
//   let systemInfoIndex = 0;

//   function addSystemInfoRow() {
//     const container = document.getElementById('systemInfoFields');
//     if (!container) return;

//     const rowId = `systemInfoRow_${systemInfoIndex}`;
//     const systemDropdownId = `system_${systemInfoIndex}`;
//     const typeDropdownId = `type_${systemInfoIndex}`;

//     const html = `
//           <div class="row mb-2" id="${rowId}">
//             <div class="col-md-3">
//               <select class="form-select" id="${systemDropdownId}" required></select>
//             </div>
//             <div class="col-md-3">
//               <select class="form-select" id="${typeDropdownId}" required></select>
//             </div>
//             <div class="col-md-2">
//               <input type="text" class="form-control" id="key_${systemInfoIndex}" placeholder="Key" required>
//             </div>
//             <div class="col-md-3">
//               <input type="text" class="form-control" id="value_${systemInfoIndex}" placeholder="Value" required>
//             </div>
//             <div class="col-md-1">
//               <button type="button" class="btn btn-danger" onclick="removeSystemInfoRow('${rowId}')">&times;</button>
//             </div>
//           </div>
//         `;

//     container.insertAdjacentHTML('beforeend', html);

//     // Populate dropdowns after DOM insertion
//     setTimeout(() => {
//       populateDropdown(systemDropdownId, "systemType");
//       populateDropdown(typeDropdownId, "integrationSystemTypes");
//     }, 100);

//     systemInfoIndex++;
//   }

//   window.addSystemInfoRow = addSystemInfoRow;
//   window.removeSystemInfoRow = function (rowId) {
//     document.getElementById(rowId)?.remove();
//   };

//   // Bind Add button
//   const btn = document.getElementById('addSystemInfoBtn');
//   if (btn) {
//     btn.addEventListener('click', addSystemInfoRow);
//   }
// };

//Hide and show fields in legal-request form

document.addEventListener("DOMContentLoaded", function () {

  // console.log("✅ Legal request VIEW script loaded");
  // console.log("Request type:", requestType);

  if (!requestType || requestType !== "Legal Request") return;

  // ===============================
  // CONFIG
  // ===============================

  const alwaysVisibleFields = [
    "sh_requesttype",
    "sh_department",
    "sh_request",
    "sh_tickettype",
    "sh_requestorname",
    "sh_requestoremail"
  ];

  const defaultHiddenFields = [
    "sh_contractcategory",
    "sh_counterpartyname",
    "sh_golivedate",
    "sh_submitterdepartment",
    "sh_comment",
    "sh_claimamount",
    "sh_disputeexplanation",
    "sh_ndatype",
    "sh_starlinkstemplateusage",
    "sh_reasonfornoinsurance",
    "sh_reasonfornotusingtemplate",
    "sh_agreementtype",
    "sh_servicesgoodtype",
    "sh_supportingappendixincluded",
    "sh_expectedsavings",
    "sh_insurancestatus",
    "sh_approveremail",
    "sh_terminationtype",
    "legal_disclaimer"
  ];

  // ===============================
  // RULES (VISIBILITY)
  // ===============================

  const rules = [
    {
      dropdownId: "sh_requesttype",
      cases: {
        "Contract Review": [
          "sh_contractcategory",
          "sh_servicesgoodtype", 
          "sh_starlinkstemplateusage",
          "sh_supportingappendixincluded",
          "sh_counterpartyname",
          "sh_golivedate",
          "sh_submitterdepartment",
          "sh_comment"
        ],
        "New Template Draft": [
          "sh_contractcategory",
          "sh_submitterdepartment",
          "sh_comment"
        ],
        "Termination": [
          "sh_terminationtype",
          "sh_counterpartyname",
          "sh_submitterdepartment",
          "sh_comment"
        ],
        "NDA": [
          "sh_ndatype",
          "sh_counterpartyname",
          "sh_starlinkstemplateusage",
          "sh_submitterdepartment",
          "sh_comments"
        ],
        "Existing Template Amendment": [
          "sh_counterpartyname",
          "sh_submitterdepartment",
          "sh_comment"
        ],
        "Legal Notice": [
          "sh_counterpartyname",
          "sh_submitterdepartment",
          "sh_comment"
        ],
        "Legal Advice": [
          "sh_submitterdepartment",
          "sh_comment"
        ],
        "File Claim": [
          
          "sh_claimamount",
          "sh_counterpartyname",
          "sh_disputeexplanation",
          "sh_submitterdepartment",
          "sh_comment"
        ]
      }
    },
    {
      dropdownId: "sh_contractcategory",
      cases: {
        "Supplier Contract": ["sh_agreementtype"],
        "Customer Contract": ["sh_agreementtype"],
        "Others": ["sh_agreementtype"]
      }
    },
    {
      dropdownId: "sh_insurancestatus",
      cases: {
        "No": ["sh_reasonfornoinsurance"]
      }
    },
    {
      dropdownId: "sh_starlinkstemplateusage",
      cases: {
        "No": ["sh_reasonfornotusingtemplate"]
      }
    },
    {
      conditions: [
        { dropdownId: "sh_requesttype", value: "Contract Review" },
        { dropdownId: "sh_contractcategory", value: "Supplier Contract" }
      ],
      showFields: [
        "sh_servicesgoodtype",
        "sh_supportingappendixincluded",
        "sh_expectedsavings",
        "sh_insurancestatus"
      ]
    },
    {
      dropdownId: "sh_submitterdepartment",
      cases: {
        "Admin": ["sh_approveremail"],
        "B2B": ["sh_approveremail"],
        "B2C": ["sh_approveremail"],
        "Finance": ["sh_approveremail"],
        "F&T": ["sh_approveremail"],
        "IT": ["sh_approveremail"],
        "HR": ["sh_approveremail"],
        "Solutions": ["sh_approveremail"],
        "Procurements": ["sh_approveremail"],
        "Others": ["sh_approveremail"],
        "Marketing": ["sh_approveremail"],
        "Leadership Team": ["sh_approveremail"]
      }
    }
  ];

  // ===============================
  // HELPERS
  // ===============================

  function getSelectedText(dropdownId) {
    const ddl = document.getElementById(dropdownId);
    if (!ddl) return null;
    return ddl.options[ddl.selectedIndex]?.text ?? null;
  }

  function getFieldContainer(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return null;

    return (
      field.closest("tr") ||
      field.closest(".form-group") ||
      field.closest(".control") ||
      field.closest(".field") ||
      field.parentElement
    );
  }

  function showField(fieldId) {
    const container = getFieldContainer(fieldId);
    if (container) container.style.removeProperty("display");
  }

  function hideField(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    field.removeAttribute("required");

    const label = document.querySelector(`label[for="${fieldId}"]`);
    if (label) label.textContent = label.textContent.replace(/\s*\*$/, "");

    const container = getFieldContainer(fieldId);
    if (container) container.style.setProperty("display", "none");
  }

  function hideDefaultFields() {
    defaultHiddenFields.forEach(hideField);
  }

  function matchesConditions(conditions) {
    return conditions.every(c => getSelectedText(c.dropdownId) === c.value);
  }

  // ===============================
  // APPLY RULES
  // ===============================

  function applyRules() {

    hideDefaultFields();

    // dropdown → cases
    rules.forEach(rule => {
      if (!rule.dropdownId || !rule.cases) return;

      const selectedText = getSelectedText(rule.dropdownId);
      (rule.cases[selectedText] || []).forEach(showField);
    });

    // AND rules
    rules.forEach(rule => {
      if (!rule.conditions || !rule.showFields) return;
      if (matchesConditions(rule.conditions)) {
        rule.showFields.forEach(showField);
      }
    });

    // console.log("✅ View rules applied");
  }

  // ===============================
  // SAFE APPLY (for View pages)
  // ===============================

  function runApplyRulesSafely(retries = 6, delay = 300) {
    let attempts = 0;

    const interval = setInterval(() => {
      attempts++;
      applyRules();

      if (attempts >= retries) {
        clearInterval(interval);
        // console.log("✅ Final view-state settled");
      }
    }, delay);
  }

  // ===============================
  // INIT
  // ===============================

  runApplyRulesSafely();

});



/* ============================================================
   EDIT MODE MANAGER
   Add this block to the view page global JS file.
   Depends on: populateDropdown(), loadAllDropdownConfigs(),
               setupTypeCategoryFilter(), dropdownConfigCache
               itVerticals, itCategoriesByVertical, itSubCategories, itServicesData
               (the last four come from IT Generic Metadata template)
   flowUrl is already defined on the view page via Liquid.
============================================================ */

/* ============================================================
   1. REGISTRY
   One entry per requestType.
   
   apiDropdowns   : populated from dropdownConfigCache via populateDropdown()
   staticSelects  : hardcoded <select> elements — just enable/disable
   textFields     : <input> or <textarea> — remove/restore readonly
   cascadeGroup   : "IT" triggers the IT cascade handler (null for others)
   postActivate   : name of a function to call after fields are enabled
                    (e.g. to re-wire dependent filter listeners)
============================================================ */
const editModeRegistry = {

  "IT Request": {
    apiDropdowns:  [],                          // vertical/category handled by cascadeGroup
    staticSelects: ["sh_legalentity", "sh_environment"],
    textFields:    ["sh_url", "sh_description", "sh_additionalinformation"],
     requiredFields: ["sh_vertical", "sh_itcategory", "sh_itsubcategory", 
                   "sh_itservice", "sh_additionalinformation"],
    cascadeGroup:  "IT",
    postActivate:  null
  },

  "Consignee Support": {
    apiDropdowns: [
      { id: "sh_type",         cacheKey: "csType"           },
      { id: "sh_category",     cacheKey: "csCategories"     },
      { id: "sh_selfor3pl",    cacheKey: "csServiceProvider"},
      { id: "sh_hub",          cacheKey: "csHub"            },
      { id: "sh_plpartner",    cacheKey: "3PLPartners"      },
      { id: "sh_shipmenttype", cacheKey: "shipmentType"     },
      { id: "sh_sourcechannel",cacheKey: "sourceChannel"    }
    ],
    staticSelects: [],
    textFields: [
      "sh_awb","sh_ordernumber","sh_description",
      "sh_consigneename","sh_consigneeemail","sh_consigneephone",
      "sh_customername","sh_newmobilenumber",
      "sh_newaddressline1","sh_newaddressline2","sh_newaddresscity",
      "sh_newaddressstate","sh_newaddresscountry","sh_newaddresspincode",
      "sh_addressadditionalnumber","sh_shortaddresscode"
    ],
    cascadeGroup: null,
    postActivate: "consigneeSupportFilters"    // re-wires type→category filter
  },

  "HR Request": {
    apiDropdowns:  [],
    staticSelects: [],
    textFields:    ["sh_additionalinformation"],
    cascadeGroup:  "HR",                       // HR has same tile pattern as IT
    postActivate:  null
  },

  "Finance Request": {
    apiDropdowns:  [],
    staticSelects: [],
    textFields:    ["sh_additionalinformation"],
    cascadeGroup:  "Finance",
    postActivate:  null
  },

  "Procurement Request": {
    apiDropdowns: [
      { id: "sh_procurementcategory", cacheKey: "procurementCategoryKSA" },
      { id: "sh_country",             cacheKey: "countryName"            },
      { id: "sh_findimvertical",      cacheKey: "finDimensonVertical"    },
      { id: "sh_findimcostcentre",    cacheKey: "finDimensonCostCenter"  },
      { id: "sh_findimsite",          cacheKey: "finDimensonSite"        },
      { id: "sh_findimservice",       cacheKey: "finDimensonService"     },
      { id: "sh_findimsubservice",    cacheKey: "finDimensonSubService"  }
    ],
    staticSelects: ["sh_legalentityname","transactioncurrencyid"],
    textFields: [
      "sh_projectname","sh_serviceneededby","sh_projectdetails","sh_projectedbudget"
    ],
    cascadeGroup:  null,
    postActivate: "procurementCurrency"
  },

  "Legal Request": {
    apiDropdowns: [
      { id: "sh_requesttype",               cacheKey: "legalRequestType"      },
      { id: "sh_ndatype",                   cacheKey: "legalNdaType"          },
      { id: "sh_contractcategory",          cacheKey: "legalContractCategory" },
      { id: "sh_terminationtype",           cacheKey: "legalTerminationType"  },
      { id: "sh_supportingappendixincluded",cacheKey: "genericYesNo"          },
      { id: "sh_insurancestatus",           cacheKey: "genericYesNo"          },
      { id: "sh_starlinkstemplateusage",    cacheKey: "genericYesNo"          }
    ],
    staticSelects: [],
    textFields: [
      "sh_counterpartyname","sh_golivedate","sh_claimamount",
      "sh_disputeexplanation","sh_reasonfornoinsurance",
      "sh_reasonfornotusingtemplate","sh_comment","sh_agreementtype",
      "sh_servicesgoodtype","sh_expectedsavings"
    ],
    cascadeGroup:  null,
    postActivate:  null
  },

  "Customer Onboarding": {
    apiDropdowns: [
      { id: "sh_customertype",               cacheKey: "customerType"       },
      { id: "sh_paymentterms",               cacheKey: "paymentTerms"       },
      { id: "sh_cashondelivery",             cacheKey: "genericYesNo"       },
      { id: "sh_wms",                        cacheKey: "wms"                },
      { id: "sh_multiplewarehouseallocations",cacheKey: "genericYesNo"      },
      { id: "sh_integrationchannel",         cacheKey: "integrationChannels"},
      { id: "sh_trainingrequired",           cacheKey: "genericYesNo"       },
      { id: "sh_stocksync",                  cacheKey: "genericYesNo"       },
      { id: "sh_autofulfillment",            cacheKey: "genericYesNo"       },
      { id: "sh_consigneenotification",      cacheKey: "notificationTypes"  }
    ],
    staticSelects: [],
    textFields: [
      "sh_customername","sh_crnumber","sh_creditlimit","sh_expectedgolivedate",
      "sh_trainingemails","sh_consigneenotificationtext",
      "sh_expecteddailyvolumninpeaks","sh_additionalrequirements",
      "sh_pickupaddress","sh_brandname","sh_storeurl"
    ],
    cascadeGroup:  null,
    postActivate:  null
  }

  // Add more request types here as needed following the same pattern
};


/* ============================================================
   2. POST-ACTIVATE HOOKS
   Named functions called after edit mode fields are enabled.
   Add new hooks here as needed.
============================================================ */
const postActivateHooks = {

  consigneeSupportFilters: function () {
    // Re-wire the type→category cascade filter
    // (setupTypeCategoryFilter is already defined in the shared global JS)
    setupTypeCategoryFilter("sh_type", "sh_category");
  },

   procurementCurrency: async function () {
    await activateProcurementCurrencyDropdown();
  }


};


/* ============================================================
   3. IT CASCADE HANDLER
   Populates the four IT selects from the itXxx arrays.
   Called by EditModeManager when cascadeGroup === "IT".
   Saved values come from the DOM (the single Liquid-rendered option).
============================================================ */
const ITCascadeHandler = {

  _savedText(id) {
    const el = document.getElementById(id);
    if (!el) return "";

    const selectedOption = el.options[el.selectedIndex];

    return (
      selectedOption?.textContent?.trim() ||
      selectedOption?.value?.trim() ||
      ""
    );
  },

  _fillSelect(id, items, savedValue) {
    const sel = document.getElementById(id);
    if (!sel) return;

    const cleanSaved = (savedValue || "").trim().toLowerCase();
    let matched = false;

    sel.innerHTML = '<option value="">Select</option>';

    items.forEach(item => {
      const label = typeof item === "string" ? item : item.label;
      const cleanLabel = (label || "").trim().toLowerCase();

      const opt = document.createElement("option");
      opt.value = label;
      opt.textContent = label;

      if (cleanLabel === cleanSaved) {
        opt.selected = true;
        matched = true;
      }

      sel.appendChild(opt);
    });

    if (!matched && savedValue) {
      const oldOpt = document.createElement("option");
      oldOpt.value = savedValue;
      oldOpt.textContent = savedValue;
      oldOpt.selected = true;
      sel.appendChild(oldOpt);
    }

    console.log("IT dropdown filled:", {
      id,
      savedValue,
      matched,
      finalValue: sel.value,
      finalText: sel.options[sel.selectedIndex]?.textContent
    });
  },

  _syncERPFields(category) {
    const erpFields = ["div-url", "div-legalentity", "div-environment", "sh_description"];
    const isERP = category === "D365 Dynamics & Rydoo";

    erpFields.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;

      const wrapper = el.closest(".col-12, .mb-3") || el;
      wrapper.style.display = isERP ? "" : "none";
    });
  },

  init() {
    const savedVertical    = this._savedText("sh_vertical");
    const savedCategory    = this._savedText("sh_itcategory");
    const savedSubCategory = this._savedText("sh_itscope");
    const savedService     = this._savedText("sh_itsubcategory");

    console.log("IT saved values before edit init:", {
      savedVertical,
      savedCategory,
      savedSubCategory,
      savedService
    });

    this._fillSelect("sh_vertical", itVerticals, savedVertical);

    const verticalValue =
      document.getElementById("sh_vertical")?.value || savedVertical;

    const catItems = itCategoriesByVertical[verticalValue] || [];
    this._fillSelect("sh_itcategory", catItems, savedCategory);

    const categoryValue =
      document.getElementById("sh_itcategory")?.value || savedCategory;

    this._fillSelect("sh_itscope", itSubCategories, savedSubCategory);

    const subCategoryValue =
      document.getElementById("sh_itscope")?.value || savedSubCategory;

    const svcItems =
      itServicesData?.[verticalValue]?.[categoryValue]?.[subCategoryValue] || [];

    this._fillSelect("sh_itsubcategory", svcItems, savedService);

    this._syncERPFields(categoryValue);

    console.log("IT values after edit init:", {
      verticalValue,
      categoryValue,
      subCategoryValue,
      serviceValue: document.getElementById("sh_itsubcategory")?.value
    });

    this._wireListeners();
  },

  _wireListeners() {
    const vertical    = document.getElementById("sh_vertical");
    const category    = document.getElementById("sh_itcategory");
    const subCategory = document.getElementById("sh_itscope");

    if (vertical) {
      vertical.addEventListener("change", () => {
        const v = vertical.value;

        this._fillSelect("sh_itcategory", itCategoriesByVertical[v] || [], "");
        this._fillSelect("sh_itscope", itSubCategories, "");
        this._fillSelect("sh_itsubcategory", [], "");

        this._syncERPFields("");
      });
    }

    if (category) {
      category.addEventListener("change", () => {
        const c = category.value;

        this._fillSelect("sh_itscope", itSubCategories, "");
        this._fillSelect("sh_itsubcategory", [], "");

        this._syncERPFields(c);
      });
    }

    if (subCategory) {
      subCategory.addEventListener("change", () => {
        const v  = document.getElementById("sh_vertical")?.value || "";
        const c  = document.getElementById("sh_itcategory")?.value || "";
        const sc = subCategory.value;

        const svcs = itServicesData?.[v]?.[c]?.[sc] || [];

        this._fillSelect("sh_itsubcategory", svcs, "");
      });
    }
  },

  reset(snapshots) {
    ["sh_vertical", "sh_itcategory", "sh_itscope", "sh_itsubcategory"].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;

      const saved = snapshots[id] || "";

      el.innerHTML = `<option value="${saved}" selected>${saved}</option>`;
      el.disabled = true;

      el.replaceWith(el.cloneNode(true));
    });
  }

};


/* ============================================================
   4. EDIT MODE MANAGER
============================================================ */
async function activateProcurementCurrencyDropdown() {
  const currencyDDL = document.getElementById("transactioncurrencyid");
  if (!currencyDDL) return;

  const savedValue =
    currencyDDL.value ||
    currencyDDL.options[currencyDDL.selectedIndex]?.value ||
    "";

  const savedText =
    currencyDDL.options[currencyDDL.selectedIndex]?.textContent?.trim() || "";

  await getCurrencies("transactioncurrencyid", "Loading ...");

  // 1. Best case: match by GUID
  if (savedValue) {
    const matchByValue = Array.from(currencyDDL.options).find(opt =>
      opt.value?.toLowerCase() === savedValue.toLowerCase()
    );

    if (matchByValue) {
      currencyDDL.value = matchByValue.value;
    }
  }

  // 2. Fallback: match by text, including cases like "Saudi Riyal" vs "Saudi Riyal (SAR)"
  if (!currencyDDL.value && savedText) {
    const cleanSavedText = savedText.toLowerCase().trim();

    const matchByText = Array.from(currencyDDL.options).find(opt => {
      const optionText = opt.textContent.toLowerCase().trim();

      return (
        optionText === cleanSavedText ||
        optionText.startsWith(cleanSavedText + " ") ||
        optionText.includes(cleanSavedText)
      );
    });

    if (matchByText) {
      currencyDDL.value = matchByText.value;
    }
  }

  currencyDDL.disabled = false;

  console.log("Currency restored in edit mode:", {
    savedValue,
    savedText,
    finalValue: currencyDDL.value,
    finalText: currencyDDL.options[currencyDDL.selectedIndex]?.textContent
  });
}

const EditModeManager = (() => {

  let _active        = false;
  let _originalValues = {};   // snapshot of all registered field values
  let _changeTracker  = {};   // only fields that differ from original
  let _currentConfig  = null; // registry entry for the active requestType
  let _currentType    = null;

  /* ── helpers ── */

  function _getEl(id) { return document.getElementById(id); }

  function _snapAndTrack(id) {
    const el = _getEl(id);
    if (!el) return;

    // Store original value
    _originalValues[id] = el.value;

    // Attach change tracker
    el.addEventListener("change", _onFieldChange);
  }

  function _onFieldChange(e) {
    const id  = e.target.id;
    const val = e.target.value;
    if (val !== _originalValues[id]) {
      _changeTracker[id] = val;
    } else {
      delete _changeTracker[id];
    }
  }

  function _removeTracker(id) {
    const el = _getEl(id);
    if (el) el.removeEventListener("change", _onFieldChange);
  }

  /* ── public API ── */

  function activate(requestType) {
    if (_active) return;

    const config = editModeRegistry[requestType];
    if (!config) {
      console.warn("EditModeManager: no registry entry for", requestType);
      return;
    }

    _active        = true;
    _currentConfig = config;
    _currentType   = requestType;
    _originalValues = {};
    _changeTracker  = {};

    /* 1. API Dropdowns — populate from cache + restore saved text */
    (config.apiDropdowns || []).forEach(({ id, cacheKey }) => {
      const el = _getEl(id);
      if (!el) return;
      const savedText = el.options[el.selectedIndex]?.textContent?.trim() || "";
      populateDropdown(id, cacheKey, savedText);
      el.disabled = false;
      _snapAndTrack(id);

      console.log("Edit mode dropdown restored:", {
        id,
        cacheKey,
        savedText,
        restoredValue: el.value,
        restoredText: el.options[el.selectedIndex]?.textContent
      });
    });

    /* 2. Static Selects — just enable */
    (config.staticSelects || []).forEach(id => {
      const el = _getEl(id);
      if (!el) return;
      el.disabled = false;
      _snapAndTrack(id);
    });

    /* 3. Text Fields — remove readonly */
    (config.textFields || []).forEach(id => {
      const el = _getEl(id);
      if (!el) return;
      el.removeAttribute("readonly");
      _snapAndTrack(id);
    });

    /* 4. Cascade group */
    if (config.cascadeGroup === "IT") {
      // Snapshot the four cascade selects BEFORE ITCascadeHandler replaces their options
      ["sh_vertical", "sh_itcategory", "sh_itscope", "sh_itsubcategory"].forEach(id => {
        const el = _getEl(id);
        if (el) {
         const selectedOption = el.options[el.selectedIndex];

          _originalValues[id] =
            selectedOption?.textContent?.trim() ||
            selectedOption?.value?.trim() ||
            "";

          el.disabled = false;
        }
      });
      ITCascadeHandler.init();
      // Attach change trackers to cascade selects after init has wired its own listeners
      ["sh_vertical", "sh_itcategory", "sh_itscope", "sh_itsubcategory"].forEach(id => {
        const el = _getEl(id);
        if (el) el.addEventListener("change", _onFieldChange);
      });
    }

    // HR / Finance cascade groups can be added here following same pattern

    /* 5. Post-activate hook */
    if (config.postActivate && postActivateHooks[config.postActivate]) {
      postActivateHooks[config.postActivate]();
    }

    _updateButtonUI(true);
  }

 

  function cancel() {
    if (!_active || !_currentConfig) return;
    const config = _currentConfig;

    /* Restore and re-lock API dropdowns */
    (config.apiDropdowns || []).forEach(({ id }) => {
      const el = _getEl(id);
      if (!el) return;
      _removeTracker(id);
      el.disabled = true;
      // Restore single saved option
      const saved = _originalValues[id] || "";
      // Find text of original option to restore readable label
      const savedText = _findTextByValue(el, saved) || saved;
      el.innerHTML = `<option value="${saved}" selected>${savedText}</option>`;
    });

    /* Restore and re-lock static selects */
    (config.staticSelects || []).forEach(id => {
      const el = _getEl(id);
      if (!el) return;
      _removeTracker(id);
      el.value    = _originalValues[id] || "";
      el.disabled = true;
    });

    /* Restore and re-readonly text fields */
    (config.textFields || []).forEach(id => {
      const el = _getEl(id);
      if (!el) return;
      _removeTracker(id);
      el.value = _originalValues[id] || "";
      el.setAttribute("readonly", true);
    });

    /* Restore cascade group */
    if (config.cascadeGroup === "IT") {
      ["sh_vertical", "sh_itcategory", "sh_itscope", "sh_itsubcategory"].forEach(id => {
        const el = _getEl(id);
        if (!el) return;
        _removeTracker(id);
      });
      ITCascadeHandler.reset(_originalValues);
    }

    _active         = false;
    _currentConfig  = null;
    _changeTracker  = {};
    _originalValues = {};

    _updateButtonUI(false);
  }

  function getChanges() {
    // Returns only changed fields + always include identifiers for the flow
    return { ..._changeTracker };
  }

  /* ── internal helpers ── */

  function _findTextByValue(selectEl, value) {
    for (const opt of selectEl.options) {
      if (opt.value === value) return opt.text;
    }
    return value;
  }

  function _updateButtonUI(isEditing) {
    const editBtn = document.getElementById("enableEditBtn");
    const saveBtn = document.getElementById("saveChangesBtn");

    if (editBtn) {
      editBtn.innerHTML = isEditing
        ? '<i class="bi bi-x-circle me-2"></i> Cancel Edit'
        : '<i class="bi bi-pencil me-2"></i> Edit';
      editBtn.classList.toggle("btn-primary",      !isEditing);
      editBtn.classList.toggle("btn-outline-danger", isEditing);
    }

    if (saveBtn) {
      saveBtn.style.display = isEditing ? "inline-block" : "none";
    }
  }
  
  function validate() {
  if (!_currentConfig) return true;

  const emptyFields = [];

  (_currentConfig.requiredFields || []).forEach(id => {
    const el = _getEl(id);
    if (!el) return;
    if (!el.value || el.value.trim() === "") {
      // Get the label text for a readable error message
      const label = document.querySelector(`label[for="${id}"]`);
      const fieldName = label?.textContent?.replace("*", "").trim() || id;
      emptyFields.push(fieldName);
    }
  });

  if (emptyFields.length > 0) {
    showToast(`Required: ${emptyFields.join(", ")}`, "danger");
    return false;
  }

  return true;
}

  return { activate, cancel, getChanges, validate  };

})();

function applyChangedValuesToView(changedValues) {
  const reverseFieldMap = {
    sh_vertical: "sh_vertical",
    sh_support: "sh_itcategory",
    sh_scope: "sh_itscope",
    sh_category: "sh_itsubcategory",
    sh_url: "sh_url",
    sh_legalentity: "sh_legalentity",
    sh_environment: "sh_environment",
    sh_description: "sh_description", 
    sh_additionalinformation: "sh_additionalinformation"
  };

  Object.keys(changedValues || {}).forEach(columnName => {
    const fieldId = reverseFieldMap[columnName] || columnName;
    const el = document.getElementById(fieldId);

    if (!el) return;

    if (el.tagName === "SELECT") {
      const newValue = changedValues[columnName];

      const selectedText =
        el.options[el.selectedIndex]?.textContent?.trim() ||
        newValue;

      el.innerHTML = `<option value="${newValue}" selected>${selectedText}</option>`;
      el.disabled = true;
    } else {
      el.value = changedValues[columnName];
      el.setAttribute("readonly", true);
    }
  });
}

function lockViewFormAfterSave() {
  const form = document.getElementById("view-ticket-form");

  if (form) {
    form.querySelectorAll("select").forEach(el => {
      el.disabled = true;
    });

    form.querySelectorAll("input:not([type='hidden']), textarea").forEach(el => {
      el.setAttribute("readonly", true);
    });
  }

  const editBtn = document.getElementById("enableEditBtn");
  const saveBtn = document.getElementById("saveChangesBtn");

  if (editBtn) {
    editBtn.innerHTML = '<i class="bi bi-pencil me-2"></i> Edit';
    editBtn.classList.add("btn-primary");
    editBtn.classList.remove("btn-outline-danger");
  }

  if (saveBtn) {
    saveBtn.style.display = "none";
  }
}

/* ============================================================
   5. EDIT BUTTON + SAVE BUTTON HANDLERS
   Replace the previous enableEditBtn script on the view page.
============================================================ */
document.addEventListener("DOMContentLoaded", function () {

  const editBtn = document.getElementById("enableEditBtn");
  const saveBtn = document.getElementById("saveChangesBtn");

  if (editBtn) {
    editBtn.addEventListener("click", function () {
      if (document.body.classList.contains("edit-mode-active")) {
        // Currently editing → cancel
        document.body.classList.remove("edit-mode-active");
         EditModeManager.cancel();
      } else {
        // Not editing → activate
        document.body.classList.add("edit-mode-active");
        EditModeManager.activate(requestType); // requestType is set by Liquid on the view page
      }
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener("click", async function () {
      const rawChanges = EditModeManager.getChanges();
      const updatePayload = buildMetadataUpdatePayload(rawChanges);

      // console.log("Save button clicked");
      // console.log("Raw changed fields:", rawChanges);
      // console.log("Update Metadata Flow URL:", updateMetadataFlowUrl);
      // console.log("Payload sent to UpdateMetadata flow:", updatePayload);
      console.table(updatePayload.changedValues);

      if (!EditModeManager.validate()) return; // toast already shown inside validate()

      const changes = EditModeManager.getChanges();
      if (!Object.keys(changes).length) {
        showToast("No changes to save.", "warning");
        return;
      }

      if (!Object.keys(updatePayload.changedValues || {}).length) {
        showToast("No changes to save.", "warning");
        return;
      }

      if (!updateMetadataFlowUrl) {
        console.error("UpdateMetadataFlowUrl is missing.");
        showToast("Update Metadata Flow URL is missing.", "danger");
        return;
      }

      if (
        !updatePayload.metadataUpdate.tableName ||
        !updatePayload.metadataUpdate.rowIdColumn ||
        !updatePayload.metadataUpdate.rowId
      ) {
        console.error("Missing metadata update information:", updatePayload);
        showToast("Missing metadata row information.", "danger");
        return;
      }

      showLoader("Saving changes...");

      try {
        const response = await fetch(updateMetadataFlowUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatePayload)
        });

        const result = await response.json();
        hideLoader();

        console.log("Update Metadata Flow Response:", result);

        if (response.ok && result?.success === true) {
          showToast("Details have been updated successfully!", "success");

          applyChangedValuesToView(rawChanges);

          document.body.classList.remove("edit-mode-active");
          lockViewFormAfterSave();

        } else {
          showToast(result?.message || "Failed to save changes.", "danger");
        }

      } catch (err) {
        hideLoader();
        console.error("Update Metadata Flow call failed:", err);
        showToast("An unexpected error occurred. Please try again.", "danger");
      }
    });
  }

});

// This function is used to format lookUp values in required format for metadata update

function getApiDropdownLookupMap(requestType) {
    const config = editModeRegistry[requestType];
    const lookupMap = {};

    if (!config || !Array.isArray(config.apiDropdowns)) {
      return lookupMap;
    }

    config.apiDropdowns.forEach(dd => {
      lookupMap[dd.id] = true;
    });

    return lookupMap;
  }

function toDropdownConfigurationBind(id) {
    if (!id) return null;

    // Power Pages dropdown values should already be GUIDs from populateDropdown()
    return `/sh_dropdownconfigurations(${id})`;
  }

  function getCurrencyLookupMap(requestType) {
  const map = {};

  if (requestType === "Procurement Request") {
    map["transactioncurrencyid"] = true;
  }

  return map;
}

function toTransactionCurrencyBind(id) {
  if (!id) return null;
  return `/transactioncurrencies(${id})`;
}


/* ============================================================
   6. Handle the json formatting and sending data to UpdateMetaData
   Flow.
============================================================ */

function buildMetadataUpdatePayload(rawChanges) {
  const fieldMapByRequestType = {
    "IT Request": {
      sh_vertical: "sh_vertical",
      sh_itcategory: "sh_support",
      sh_itscope: "sh_scope",
      sh_itsubcategory: "sh_category",
      sh_legalentity: "sh_legalentity",
      sh_environment: "sh_environment",
      sh_url: "sh_url",
      sh_description: "sh_description",
      sh_additionalinformation: "sh_additionalinformation"
    },

    "Consignee Support": {
      sh_type: "sh_type",
      sh_category: "sh_category",
      sh_selfor3pl: "sh_selfor3pl",
      sh_hub: "sh_hub",
      sh_plpartner: "sh_plpartner",
      sh_shipmenttype: "sh_shipmenttype",
      sh_sourcechannel: "sh_sourcechannel",
      sh_awb: "sh_awb",
      sh_ordernumber: "sh_ordernumber",
      sh_description: "sh_description",
      sh_consigneename: "sh_consigneename",
      sh_consigneeemail: "sh_consigneeemail",
      sh_consigneephone: "sh_consigneephone",
      sh_customername: "sh_customername",
      sh_newmobilenumber: "sh_newmobilenumber",
      sh_newaddressline1: "sh_newaddressline1",
      sh_newaddressline2: "sh_newaddressline2",
      sh_newaddresscity: "sh_newaddresscity",
      sh_newaddressstate: "sh_newaddressstate",
      sh_newaddresscountry: "sh_newaddresscountry",
      sh_newaddresspincode: "sh_newaddresspincode",
      sh_addressadditionalnumber: "sh_addressadditionalnumber",
      sh_shortaddresscode: "sh_shortaddresscode"
    },

    "Procurement Request": {
      sh_procurementcategory: "sh_ProcurementCategory",
      sh_country: "sh_Country",
      transactioncurrencyid: "transactioncurrencyid",
      sh_findimvertical: "sh_findimvertical",
      sh_findimcostcentre: "sh_findimcostcentre",
      sh_findimsite: "sh_findimsite",
      sh_findimservice: "sh_findimservice",
      sh_findimsubservice: "sh_findimsubservice",
      sh_projectname: "sh_projectname",
      sh_serviceneededby: "sh_serviceneededby",
      sh_projectdetails: "sh_projectdetails",
      sh_projectedbudget: "sh_projectedbudget",
      sh_legalentityname: "sh_legalentity"
    },

    "Legal Request": {
      sh_requesttype: "sh_requesttype",
      sh_ndatype: "sh_ndatype",
      sh_contractcategory: "sh_contractcategory",
      sh_terminationtype: "sh_terminationtype",
      sh_supportingappendixincluded: "sh_supportingappendixincluded",
      sh_insurancestatus: "sh_insurancestatus",
      sh_starlinkstemplateusage: "sh_starlinkstemplateusage",
      sh_counterpartyname: "sh_counterpartyname",
      sh_golivedate: "sh_golivedate",
      sh_claimamount: "sh_claimamount",
      sh_disputeexplanation: "sh_disputeexplanation",
      sh_reasonfornoinsurance: "sh_reasonfornoinsurance",
      sh_reasonfornotusingtemplate: "sh_reasonfornotusingtemplate",
      sh_comment: "sh_comment",
      sh_agreementtype: "sh_agreementtype",
      sh_servicesgoodtype: "sh_servicesgoodtype",
      sh_expectedsavings: "sh_expectedsavings"
    },

    "Customer Onboarding": {
      sh_customertype: "sh_customertype",
      sh_paymentterms: "sh_paymentterms",
      sh_cashondelivery: "sh_cashondelivery",
      sh_wms: "sh_wms",
      sh_multiplewarehouseallocations: "sh_multiplewarehouseallocations",
      sh_integrationchannel: "sh_integrationchannel",
      sh_trainingrequired: "sh_trainingrequired",
      sh_stocksync: "sh_stocksync",
      sh_autofulfillment: "sh_autofulfillment",
      sh_consigneenotification: "sh_consigneenotification",
      sh_customername: "sh_customername",
      sh_crnumber: "sh_crnumber",
      sh_creditlimit: "sh_creditlimit",
      sh_expectedgolivedate: "sh_expectedgolivedate",
      sh_trainingemails: "sh_trainingemails",
      sh_consigneenotificationtext: "sh_consigneenotificationtext",
      sh_expecteddailyvolumninpeaks: "sh_expecteddailyvolumninpeaks",
      sh_additionalrequirements: "sh_additionalrequirements",
      sh_pickupaddress: "sh_pickupaddress",
      sh_brandname: "sh_brandname",
      sh_storeurl: "sh_storeurl"
    }
  };

  const map = fieldMapByRequestType[metadataUpdateInfo.requestType] || {};
  const apiDropdownLookupMap = getApiDropdownLookupMap(metadataUpdateInfo.requestType);
  const currencyLookupMap = getCurrencyLookupMap(metadataUpdateInfo.requestType);
  const changedValues = {};
  const numberFieldsByRequestType = {
  "Procurement Request": [
    "sh_projectedbudget"
  ],

  "Legal Request": [
    "sh_claimamount",
    "sh_expectedsavings"
  ],

  "Customer Onboarding": [
    "sh_creditlimit",
    "sh_expecteddailyvolumninpeaks"
  ]
};

const choiceFieldsByRequestType = {
  "Procurement Request": [
    "sh_legalentityname"
  ]
};

const choiceFields = choiceFieldsByRequestType[metadataUpdateInfo.requestType] || [];

const numberFields = numberFieldsByRequestType[metadataUpdateInfo.requestType] || [];

  Object.keys(rawChanges).forEach(uiFieldId => {
  const dataverseColumnName = map[uiFieldId] || uiFieldId;

  let value = rawChanges[uiFieldId];

  if (numberFields.includes(uiFieldId)) {
    value = value === "" || value === null || value === undefined
      ? null
      : Number(String(value).replace(/,/g, ""));
  }

  if (choiceFields.includes(uiFieldId)) {
    value = value === "" || value === null || value === undefined
      ? null
      : parseInt(value, 10);
  }

  // API dropdowns are lookup columns to sh_dropdownconfiguration
  if (apiDropdownLookupMap[uiFieldId]) {
  if (value) {
    changedValues[`${dataverseColumnName}@odata.bind`] = toDropdownConfigurationBind(value);
  } else {
    changedValues[dataverseColumnName] = null;
  }
} else if (currencyLookupMap[uiFieldId]) {
  if (value) {
    changedValues[`${dataverseColumnName}@odata.bind`] = toTransactionCurrencyBind(value);
  } else {
    changedValues[dataverseColumnName] = null;
  }
} else {
  changedValues[dataverseColumnName] = value;
}
});

  return {
    operation: "update-metadata",
    basicInfo: {
      requestType: metadataUpdateInfo.requestType,
      selectedForm: metadataUpdateInfo.formName,
      ticketId: ticketId
    },
    metadataUpdate: {
      tableName: metadataUpdateInfo.tableName,
      rowIdColumn: metadataUpdateInfo.rowIdColumn,
      rowId: metadataUpdateInfo.rowId
    },
    changedValues: changedValues
  };
}