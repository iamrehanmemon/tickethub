let dropdownConfigCache = {}; // cache grouped by dropdown type
let allDropdownData = []; // all dropdown records
let attachmentIndex = 0;
let currentAttachmentType = "";

const attachmentRequiredForms = [
    "procurement-request"
];

function showLoader(message = "Processing…") {
    const loader = document.getElementById("loaderOverlay");
    const loaderMsg = document.getElementById("loaderMessage");

    // Update loader message dynamically
    if (loaderMsg) loaderMsg.textContent = message;

    // Show loader overlay
    loader.classList.remove("d-none");
    loader.classList.add("d-flex");
}

function hideLoader() {
    const loader = document.getElementById("loaderOverlay");
    // Hide loader overlay
    loader.classList.remove("d-flex");
    loader.classList.add("d-none");
}

function showToast(message, type = "success") {
    const toastEl = document.getElementById("globalToast");
    const toastBody = document.getElementById("globalToastBody");

    // Reset color classes
    toastEl.classList.remove("text-bg-success", "text-bg-danger", "text-bg-warning", "text-bg-info");
    
    // Add Bootstrap contextual background
    toastEl.classList.add(`text-bg-${type}`);

    // Set message
    toastBody.textContent = message;

    // Create and show toast
    const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
    toast.show();
}


// Fetch All Dropdown Configurations Once
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

/* ================================
   🔹 Populate Dropdown & Checkboxes from Cache
================================ */
function populateDropdown(dropdownId, dropdownType, preselectedValue = null) {
    const select = document.getElementById(dropdownId);
    if (!select) return;

    select.innerHTML = '<option value="">Select</option>';

    const options = dropdownConfigCache[dropdownType] || [];

    options.forEach(opt => {
        const option = document.createElement("option");
        option.value = opt.id;
        option.textContent = opt.text;
        select.appendChild(option);
    });

    if (preselectedValue) {
        for (let opt of select.options) {
            if (opt.textContent === preselectedValue) {
                select.value = opt.value;
                break;
            }
        }
    }
}

function renderCheckboxes(containerId, type) {
    const container = document.getElementById(containerId);
    container.innerHTML = ""; // clear old content

    if (!dropdownConfigCache[type]) {
        container.innerHTML = "<p class='text-muted'>No data found...</p>";
        return;
    }

    dropdownConfigCache[type].forEach((item, index) => {
        const checkboxId = `${type}_${index}`;

        const checkboxHTML = `
            <div class="form-check">
                <input class="form-check-input"
                       type="checkbox"
                       id="${checkboxId}"
                       name="${type}[]"
                       value="${item.text}">
                <label class="form-check-label" for="${checkboxId}">
                    ${item.text}
                </label>
            </div>
        `;

        container.insertAdjacentHTML("beforeend", checkboxHTML);
    });
}

/* ================================
   🔹 Type → Category Filter Function (GUID safe)
================================ */
function setupTypeCategoryFilter(typeDropdownId, categoryDropdownId) {
  const typeDropdown = document.getElementById(typeDropdownId);
  const categoryDropdown = document.getElementById(categoryDropdownId);

  // ✅ Hardcoded Type → Category mapping (from SLA rules)
  const typeCategoryMap = {
    "Delivery توصيل": [
      "Delay تأخير",
      "Wrong NDR سبب غير صحيح",
      "Out of Zone خارج نطاق المندوب",
      "Consignee Ready Now العميل جاهز للإستلام",
      "Address Updated تم تحديث العنوان",
      "Mobile Updated تم تحديث الجوال",
      "Address & Phone number updated تحديث العنوان ورقم التواصل"
    ],
    "Hold & RTO إلغاء و تأجيل": [
      "Delivery Reschedule تأجيل التوصيل",
      "RTO Request إلغاء التوصيل",
      "Address & Phone number updated تحديث العنوان ورقم التواصل"
    ],
    "Pick-up استلام": [
      "Delay تأخير",
      "Wrong NDR سبب غير صحيح",
      "Out of Zone خارج نطاق المندوب",
      "Consignee Ready Now العميل جاهز للإستلام",
      "Address Updated تم تحديث العنوان",
      "Mobile Updated تم تحديث الجوال",
      "Address & Phone number updated تحديث العنوان ورقم التواصل"
    ],
    "Investigate تحقق": [
      "Delivered (Wrong Scan) لم يتم التوصيل فعلياً",
      "Courier Behavior سلوك المندوب",
      "Bayan Request طلب بيان جمركي",
      "Refund Request تسوية مالي",
      "Address & Phone number updated تحديث العنوان ورقم التواصل"
    ]
  };

  if (!typeDropdown || !categoryDropdown) return;

  typeDropdown.addEventListener("change", function () {
    const selectedTypeText = typeDropdown.options[typeDropdown.selectedIndex]?.text || "";
    const allowedCategories = typeCategoryMap[selectedTypeText] || [];

    // 🔹 Get all category options from cache (with GUIDs)
    const allCategories = dropdownConfigCache["csCategories"] || [];

    // 🔹 Filter cached list by text match (but preserve GUID)
    const filtered = allCategories.filter(opt =>
      allowedCategories.some(ac => ac.trim() === opt.text.trim())
    );

    // 🔹 Clear and repopulate Category dropdown
    categoryDropdown.innerHTML = '<option value="">Select</option>';

    filtered.forEach(opt => {
      const option = document.createElement("option");
      option.value = opt.id; // ✅ Keep GUID
      option.textContent = opt.text; // Show readable label
      categoryDropdown.appendChild(option);
    });

    // If no match found, restore all
    if (filtered.length === 0) {
      allCategories.forEach(opt => {
        const option = document.createElement("option");
        option.value = opt.id;
        option.textContent = opt.text;
        categoryDropdown.appendChild(option);
      });
    }
  });
}

/* ================================
   🔹 Attachment Fields
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
   🔹 Fetch Currencies
================================ */
async function getCurrencies(dropdownId,message = "Fetching currencies...") {
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

function setupCategoryToggle() {
  const category = document.getElementById("sh_category");
  const mobileDiv = document.getElementById("newMobileNumberSection");
  const addressDiv = document.getElementById("newAddressSection");

  if (!category) return;

  category.addEventListener("change", function () {
    const text = category.options[category.selectedIndex]?.text || "";
    console.log("Selected Category:", text);

    // Hide all first
    mobileDiv.classList.add("d-none");
    addressDiv.classList.add("d-none");

    if (text.includes("Address & Phone number updated") || text.includes("تحديث العنوان ورقم التواصل")) {
      mobileDiv.classList.remove("d-none");
      addressDiv.classList.remove("d-none");
    } else if (text.includes("Mobile Updated") || text.includes("تم تحديث الجوال")) {
      mobileDiv.classList.remove("d-none");
    } else if (text.includes("Address Updated") || text.includes("تم تحديث العنوان")) {
      addressDiv.classList.remove("d-none");
    }
  });
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
    warehouseAllocation: {
        listId: "warehouseAllocationList",
        buttonId: "warehouseAllocationBtn",
        type: "warehouseAllocations"
    },
    procurementSubCategory: {
        listId: "procurementSubCategoryList",
        buttonId: "procurementSubCategoryBtn",
        type: "procurementSubCategory"
    },
    proofDelivery: {
        listId: "proofDeliveryList",
        buttonId: "proofDeliveryBtn",
        type: "deliveryProof"
    },
    integrationScope: {
        listId: "integrationScopeList",
        buttonId: "integrationScopeBtn",
        type: "integrationScope"
    },
};

// function loadMultiSelect() {
//     Object.keys(multiSelectConfig).forEach(key => {
//         const cfg = multiSelectConfig[key];
//         const list = document.getElementById(cfg.listId);

//         if (!list) return;

//         list.innerHTML = "";

//         const options = dropdownConfigCache[cfg.type] || [];

//         options.forEach((opt, idx) => {
//             const text = opt.text;
//             const id = `${key}_${idx}`;

//             list.insertAdjacentHTML("beforeend", `
//                 <li>
//                     <div class="form-check">
//                         <input class="form-check-input dd-check"
//                                type="checkbox"
//                                value="${text}"
//                                id="${id}">
//                         <label class="form-check-label" for="${id}">
//                             ${text}
//                         </label>
//                     </div>
//                 </li>
//             `);
//         });
//     });
// }

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

/* ================================
   🔹 On Page Load
================================ */
document.addEventListener("DOMContentLoaded", async function () {
    
    showLoader("Loading dropdowns..."); // show spinner immediately on page load
    await loadAllDropdownConfigs(); // ✅ Single API call for all dropdowns

    populateDropdown('sh_tickettype', 'ticketType', 'Request');
    // Default: set attachment type to empty
    currentAttachmentType = "defaultAttachment";

    if (formName === 'procurement-request') {
        populateDropdown('sh_request', 'requestType', 'Procurement Request');
        populateDropdown('sh_procurementcategory', 'procurementCategoryKSA');
        populateDropdown('sh_country', 'countryName');
        populateDropdown('sh_subcategory', 'procurementSubCategory');
        populateDropdown('sh_department', 'departmentName');
        //populateDropdown('sh_department', 'finDimensonDepartment');
        //populateDropdown('attachmentType', 'attachmentsTypeProcurementRequest');
        currentAttachmentType = "attachmentsTypeProcurementRequest";
        populateDropdown('attachmentType', currentAttachmentType);
        await getCurrencies("transactioncurrencyid", "Fetching currencies...");
        addAttachmentField(currentAttachmentType);

        // Financial Dimensions
        populateDropdown('sh_findimvertical', 'finDimensonVertical');
        //populateDropdown('sh_findimdepartment', 'finDimensonDepartment');
        populateDropdown('sh_findimcostcentre', 'finDimensonCostCenter');
       // populateDropdown('sh_findimregion', 'finDimensonRegion');
        populateDropdown('sh_findimcountry', 'finDimensonCountry');
        //populateDropdown('sh_findimcity', 'finDimensonCity');
        populateDropdown('sh_findimsite', 'finDimensonSite');
        populateDropdown('sh_findimservice', 'finDimensonService');
        populateDropdown('sh_findimsubservice', 'finDimensonSubService');
    }

    if (formName === 'hr-request') {
        populateDropdown('sh_request', 'requestType', 'HR Request');
        populateDropdown('sh_department', 'departmentName');
        currentAttachmentType = "defaultAttachment";
        populateDropdown('attachmentType', currentAttachmentType);
    }

    if (formName === 'it-request') {
        populateDropdown('sh_request', 'requestType', 'IT Request');
        populateDropdown('sh_department', 'departmentName');
        currentAttachmentType = "defaultAttachment";
        populateDropdown('attachmentType', currentAttachmentType);
    }

    if (formName === 'finance-request') {
        populateDropdown('sh_request', 'requestType', 'Finance Request');
        populateDropdown('sh_findimsite', 'finDimensonSite');
        populateDropdown('sh_department', 'departmentName');
        currentAttachmentType = "defaultAttachment";
        populateDropdown('attachmentType', currentAttachmentType);
    }

    if (formName === 'consignee-support') {
        populateDropdown('sh_request', 'requestType', 'Consignee Support');
        populateDropdown('sh_department', 'departmentName', '55 | After Sales Operations');
        populateDropdown('sh_type', 'csType');
        populateDropdown('sh_category', 'csCategories');
        populateDropdown('sh_selfor3pl', 'csServiceProvider');
        populateDropdown('sh_hub', 'csHub');
        populateDropdown('sh_plpartner', '3PLPartners');
        populateDropdown('sh_shipmenttype', 'shipmentType');
        populateDropdown('sh_sourcechannel', 'sourceChannel');
        //populateDropdown('attachmentType', 'defaultAttachment');
        currentAttachmentType = "defaultAttachment";
        populateDropdown('attachmentType', currentAttachmentType);
        setupTypeCategoryFilter("sh_type", "sh_category");
    }

    if (formName === 'customer-onboarding') {
        populateDropdown('sh_customertype', 'customerType');
        populateDropdown('sh_request', 'requestType', 'Customer Onboarding');
        populateDropdown('sh_department', 'departmentName', 'eCom');
        populateDropdown('sh_requiredservice', 'lifestyleServices');
        populateDropdown('sh_type', 'csType');
        populateDropdown('sh_category', 'csCategories');
        populateDropdown('sh_selfor3pl', 'csServiceProvider');
        populateDropdown('sh_paymentterms', 'paymentTerms');
        populateDropdown('sh_cashondelivery', 'genericYesNo');
        populateDropdown('sh_wms', 'wms');
        populateDropdown('sh_multiplewarehouseallocations', 'genericYesNo');
        populateDropdown('sh_integrationchannel', 'integrationChannels');
        populateDropdown('sh_trainingrequired', 'genericYesNo');
        populateDropdown('sh_stocksync', 'genericYesNo');
        populateDropdown('sh_autofulfillment', 'genericYesNo');
        populateDropdown('sh_consigneenotification', 'notificationTypes');  
        populateDropdown('attachmentType', currentAttachmentType);
        addAttachmentField(currentAttachmentType);
      
        // 🟢 NEW MULTI-SELECT (THIS is what was missing!)
        loadMultiSelect();
    }


    if (formName === 'legal-request') {

        populateDropdown('sh_vertical', 'finDimensonVertical');
        populateDropdown('sh_request', 'requestType', 'Legal Request');
        populateDropdown('sh_department', 'departmentName');
        populateDropdown('sh_requesttype', 'legalRequestType');
        populateDropdown('sh_ndatype', 'legalNdaType');
        populateDropdown('sh_contractcategory', 'legalContractCategory');
        populateDropdown('sh_terminationtype', 'legalTerminationType');
        // populateDropdown('sh_submitterdepartment', 'legalSubmitterDepartment');
        populateDropdown('sh_supportingappendixincluded', 'genericYesNo');
        populateDropdown('sh_insurancestatus', 'genericYesNo');
        populateDropdown('sh_starlinkstemplateusage', 'genericYesNo');
        populateDropdown('sh_insurancestatus', 'genericYesNo');
        currentAttachmentType = "legalAttachmentTypes";
        populateDropdown('attachmentType', currentAttachmentType);
        addAttachmentField(currentAttachmentType);

    }

    setupCategoryToggle();
    hideLoader(); // hide loader once everything is populated
});


function validateRequiredAttachments() {
    if (!attachmentRequiredForms.includes(formName)) return true;

    const fileInputs = document.querySelectorAll('input[type="file"]');
    const hasAttachment = Array.from(fileInputs).some(input => input.files && input.files.length > 0);

    if (!hasAttachment) {
        showToast("At least one attachment is required for this request.", "danger");
        return false;
    }

    return true;
}

/* ================================
   🔹 Form Submission Logic
================================ */
document.getElementById('create-ticket-form').addEventListener('submit', function (e) {
    e.preventDefault();

    if (formName === "hr-request") {
      if (!validateHRRequest()) {
          return; // STOP submission
      }
    }

    if (formName === "it-request") {
      if (!validateRequest()) {
          return; // STOP submission
      }
    }

    if (!validateRequiredAttachments()) {
       return; // STOP submission
    }

    showLoader("Submitting your ticket...");

    const basicInfo = getBasicInfo();
    const ticketMeta = getMetadata();
    const fileInputs = document.querySelectorAll('input[type="file"]');
    const attachments = [];

    if (fileInputs.length === 0) {
        submitSupportTicket(basicInfo, ticketMeta, attachments);
        return;
    }

    readAllAttachments(fileInputs, attachments, function () {
        submitSupportTicket(basicInfo, ticketMeta, attachments);
    });

    function getBasicInfo() {
      return {
        ticketType: sh_tickettype.value,
        requestType: sh_request.value,
        requestorName: sh_requestorname.value,
        requestorEmail: sh_requestoremail.value,
        department: sh_department.value,
        vertical: (formName === "hr-request" || formName === "it-request")
          ? state.vertical
           : (formName === "legal-request")
           ? document.getElementById("sh_vertical").options[document.getElementById("sh_vertical").selectedIndex].text
          //   ? $("#sh_vertical option:selected").text()
            : "No Vertical",
        title: (typeof title !== "undefined" && title?.value?.trim()) || "No Title Provided",
        // description: (typeof description !== "undefined" && description?.value?.trim()) || "No Description Provided",
        selectedForm: formName
      };
    }

    function getMetadata() {
        if (formName === 'consignee-support') {
            return {
                csType: sh_type.value,
                csCategories: sh_category.value,
                awb: sh_awb.value,
                csServiceProvider: sh_selfor3pl.value,
                csHub: sh_hub.value,
                partners: document.getElementById('sh_plpartner').value,
                shipmentType: sh_shipmenttype.value,
                orderNumber: sh_ordernumber.value,
                newMobileNumber: sh_newmobilenumber.value,
                sourceChannel: sh_sourcechannel.value,

                newAddressLine1: sh_newaddressline1.value,
                newAddressLine2: sh_newaddressline2.value,
                newAddressCity: sh_newaddresscity.value,
                newAddressState: sh_newaddressstate.value,
                newAddressCountry: sh_newaddresscountry.value,
                newAddressPincode: sh_newaddresspincode.value,
                newAddressAdditionalNumber: sh_addressadditionalnumber.value,
                shortaddresscode: sh_shortaddresscode.value,
                description: sh_description.value,
                
                consigneeName: sh_consigneename.value,
                consigneeEmail: sh_consigneeemail.value,
                consigneePhone: sh_consigneephone.value,
                customerName: sh_customername.value
            };
        }
        if (formName === 'procurement-request') {
          return {
            projectname: sh_projectname.value,
            serviceneededby: sh_serviceneededby.value,
            serviceEndDate: sh_serviceenddate.value,
            //projectLocation: sh_location.value,
            countryName: sh_country.value,
            procurementCategory: sh_procurementcategory.value,
            projectdetails: sh_projectdetails.value,
            currency: transactioncurrencyid.value,
            projectedbudget: sh_projectedbudget.value,

            //Financial Dimensions,
            findimvertical: sh_findimvertical.value,
            //findimdepartment: sh_findimdepartment.value,
            findimdepartment: sh_department.value,
            findimcostcentre: sh_findimcostcentre.value,
            legalentity: document.getElementById("sh_legalentityname")?.value || null,
            approvedVendor: document.getElementById("approvedVendorIdHidden").value || null,
            
            // findimregion: sh_findimregion.value,
            //findimcountry: sh_findimcountry.value,
            findimcountry: sh_country.value,
            // findimcity: sh_findimcity.value,
            findimsite: sh_findimsite.value,
            findimservice: sh_findimservice.value,
            findimsubservice: sh_findimsubservice.value

            //Delivery & Payment
            //partialdeliveryallowed: sh_partialdeliveryallowed.checked,


          };
        }

        if (formName === 'hr-request') {
            return {
                vertical: state.vertical,
                hrcategory: state.category,
                hrsubcategory: state.subcategory,
                hrservices: state.service,
                additionalInformation: $("sh_additionalinformation").value
            };
        }

        if (formName === 'finance-request') {
          return {
              vertical: state.vertical,
              category: state.category,
              subcategory: state.subcategory,
              services: state.service,
              additionalInformation: $("sh_additionalinformation").value
          };
        }

        if (formName === 'it-request') {
          return {
              vertical: state.vertical,  
              supportArea: state.category,
              scope: state.subCategory,
              category: state.service,
              service: state.service,
              legalentity: document.getElementById("sh_legalentity")?.value || null,
              environment: document.getElementById("sh_environment")?.value || null,
              url: document.getElementById("sh_url")?.value || null,
              description: document.getElementById("sh_description")?.value || null,
              additionalInformation: document.getElementById("sh_additionalinformation")?.value || null
          };
        }

        if (formName === 'legal-request') {
            return {
                vertical: sh_vertical.value,
                requesttype: sh_requesttype.value,
                ndatype: sh_ndatype.value,
                contractcategory: sh_contractcategory.value,
                terminationtype: sh_terminationtype.value,
                claimamount: sh_claimamount.value,
                disputeexplanation: sh_disputeexplanation.value,
                counterpartyname: sh_counterpartyname.value,
                agreementtype: sh_agreementtype.value,
                servicegoodtype: sh_servicesgoodtype.value,
                golivedate: sh_golivedate.value,
                expectedsavings: sh_expectedsavings.value,
                supportingappendixincluded: sh_supportingappendixincluded.value,
                insurancestatus: sh_insurancestatus.value,
                reasonfornoinsurance: sh_reasonfornoinsurance.value,
                starlinkstemplateusage: sh_starlinkstemplateusage.value,
                reasonfornotusingtemplate: sh_reasonfornotusingtemplate.value,
                // submitterdepartment: sh_submitterdepartment.value,
                // approveremails: sh_approveremail.value,
                comments:$("sh_comment").value
            };
        }
        if (formName === 'customer-onboarding') {
            return {
                customername: sh_customername.value,
                customertype: sh_customertype.value,
                customerID : document.getElementById("customerIdHidden").value,
                accountmanagerID : document.getElementById("userIdHidden").value,
                crnumber: sh_crnumber.value,
                creditlimit: sh_creditlimit.value,
                cashondelivery: sh_cashondelivery.value,
                paymentterms: sh_paymentterms.value,
                producttypes: document.getElementById("productTypesBtn").textContent.trim(),
                businessscope:document.getElementById("businessScopeBtn").textContent.trim(),
                warehouseallocations: document.getElementById("warehouseAllocationBtn").textContent.trim(),
                integrationscope:document.getElementById("integrationScopeBtn").textContent.trim(),
                proofofdelivery: document.getElementById("proofDeliveryBtn").textContent.trim(),
                // accountmanager: sh_accountmanager.value,
                expectedgolivedate: sh_expectedgolivedate.value,
                wms: sh_wms.value,
                multilplewarehouseallocations: sh_multiplewarehouseallocations.value,
                integrationchannel: sh_integrationchannel.value,
                trainingrequired:sh_trainingrequired.value,
                stocksync: sh_stocksync.value,
                trainingemails: sh_trainingemails.value,
                consigneenotification: sh_consigneenotification.value,
                consigneenotificationtext: sh_consigneenotificationtext.value,
                expecteddailyvolumeinpeaks: sh_expecteddailyvolumninpeaks.value,
                additionalrequirements: sh_additionalrequirements.value,
                pickupaddress: sh_pickupaddress.value,
                requiredservice: sh_requiredservice.value,
                brandname: sh_brandname.value,
                autofulfillment: sh_autofulfillment.value,
                storeurl: sh_storeurl.value,
                pointofcontact:  JSON.stringify(getCustomerPOCJson())
            };
        }
    }

    function readAllAttachments(inputs, attachmentsArray, onAllRead) {
        let filesProcessed = 0;
        if (inputs.length === 0) {
            onAllRead();
            return;
        }
        inputs.forEach(function (input, idx) {
            const file = input.files[0];
            if (!file) return countAndCheck();
            const reader = new FileReader();
            reader.onload = function () {
                const select = input.closest('.row').querySelector('select');
                attachmentsArray.push({
                    name: file.name,
                    type: file.type,
                    content: reader.result.split(',')[1],
                    attachmentType: select ? select.value : ''
                });
                countAndCheck();
            };
            reader.readAsDataURL(file);
            function countAndCheck() {
                filesProcessed++;
                if (filesProcessed === inputs.length) onAllRead();
            }
        });
    }

    async function submitSupportTicket(basicInfoObj, ticketMetaObj, attachmentsArray) {
        
        try {
            //const flowUrl = "{{ submitTicketEndPoint }}";
            const response = await fetch(flowUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    basicInfo: basicInfoObj,
                    ticketMeta: ticketMetaObj,
                    operation : "create",
                    attachments: attachmentsArray
                })
            });
            const result = await response.json();
            hideLoader();

            if (response.ok && result.ticketId) {
                showTicketStatusModal({
                    success: true,
                    ticketId: result.ticketId
                });
                } else {
                    showTicketStatusModal({
                        success: false,
                        message: "Unable to submit your ticket. Please try again later."
                    });
            }
        } catch (err) {
            console.error("Error submitting ticket:", err);
            hideLoader();
            showTicketStatusModal({
            success: false,
            message: "An unexpected error occurred. Please try again."
        });
        }
    }

  
    function showTicketStatusModal({ success, ticketId = null, message = "" }) {
        const modalEl = document.getElementById('ticketStatusModal');
        const iconEl = document.getElementById('ticketStatusIcon');
        const headingEl = document.getElementById('ticketStatusHeading');
        const messageEl = document.getElementById('ticketStatusMessage');

        const modal = new bootstrap.Modal(modalEl);

        if (success) {
            iconEl.className = "bi bi-check-circle-fill text-success";
            headingEl.textContent = `Ticket #${ticketId} Submitted Successfully!`;
            messageEl.textContent =
                "You'll receive an email with the estimated response time shortly. You can track the ticket's progress via the Tracking page.";
            // messageEl.innerHTML = 
            //     "You'll receive an email with the estimated response time shortly.<br>" +
            //     "You can track the ticket's progress via the Tracking page.";

        } else {
            iconEl.className = "bi bi-x-circle-fill text-danger";
            headingEl.textContent = "Ticket Submission Failed!";
            messageEl.textContent = message || "Please try again later.";
        }

        modal.show();
    }

});

//Compile the Customer Point of Contact data into a Json object
function getCustomerPOCJson() {
    console.log("get Customer POC function called");
    let data = {
        main: {
            name: document.getElementById("main_name").value.trim(),
            email: document.getElementById("main_email").value.trim(),
            phone: document.getElementById("main_phone").value.trim()
        },
        it: {
            name: document.getElementById("it_name").value.trim(),
            email: document.getElementById("it_email").value.trim(),
            phone: document.getElementById("it_phone").value.trim()
        },
        finance: {
            name: document.getElementById("fin_name").value.trim(),
            email: document.getElementById("fin_email").value.trim(),
            phone: document.getElementById("fin_phone").value.trim()
        },
        operations: {
            name: document.getElementById("ops_name").value.trim(),
            email: document.getElementById("ops_email").value.trim(),
            phone: document.getElementById("ops_phone").value.trim()
        }
    };
    console.log("get Customer POC function returned");
    return data;
}

// Conditionally make address and Mobile field required in Consignee Support form
// Category-based REQUIRED rules
document.addEventListener("DOMContentLoaded", function () {


  if (!formName || formName !== "consignee-support") return;
  const CATEGORY_DDL_ID = "sh_category";

  // Address fields required when Category = "Address updated"
  const addressFields = [
    "sh_newaddressline1",
    // "sh_newaddressline2", // optional
    "sh_newaddresscity",
    "sh_newaddressstate",
    "sh_newaddresscountry",
    "sh_newaddresspincode"
  ];

  // Mobile fields required when Category = "Mobile updated"
  const mobileFields = ["sh_newmobilenumber"];

  // Rules (match by selected TEXT)
  const requiredRules = [
   {
  when: { dropdownId: CATEGORY_DDL_ID, value: "Address & Phone number updated تحديث العنوان ورقم التواصل" },
  requiredFields: [...addressFields, ...mobileFields],  //Dots before the names are added intentionally to make array flattened
  notRequiredFields: []
},
    {
      when: { dropdownId: CATEGORY_DDL_ID, value: "Address Updated تم تحديث العنوان" },
      requiredFields: addressFields,
      notRequiredFields: mobileFields
    },
    {
      when: { dropdownId: CATEGORY_DDL_ID, value: "Mobile Updated تم تحديث الجوال" },
      requiredFields: mobileFields,
      notRequiredFields: addressFields
    }
  ];

  function getSelectedText(dropdownId) {
    const ddl = document.getElementById(dropdownId);
    if (!ddl) return null;
    return ddl.options[ddl.selectedIndex]?.text?.trim() ?? null;
  }

  function setRequired(fieldId, isRequired) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    if (isRequired) field.setAttribute("required", "required");
    else field.removeAttribute("required");

    // optional: add/remove star on label
    const label = document.querySelector(`label[for="${fieldId}"]`);
    if (!label) return;

    const hasStar = label.textContent.trim().endsWith("*");
    if (isRequired && !hasStar) label.textContent += " *";
    if (!isRequired && hasStar) label.textContent = label.textContent.replace(/\s*\*$/, "");
  }

  function clearAllManagedRequired() {
    [...new Set([...addressFields, ...mobileFields])].forEach(id => setRequired(id, false));
  }

  function applyRequiredRules() {
    clearAllManagedRequired();

    const selectedCategory = getSelectedText(CATEGORY_DDL_ID);
    if (!selectedCategory) return;

    const rule = requiredRules.find(r => r.when.value === selectedCategory);
    if (!rule) return;

    (rule.requiredFields || []).forEach(id => setRequired(id, true));
    (rule.notRequiredFields || []).forEach(id => setRequired(id, false));
  }

  const categoryDdl = document.getElementById(CATEGORY_DDL_ID);
  if (!categoryDdl) return;

  categoryDdl.addEventListener("change", applyRequiredRules);

  // run once on load (handles preselected metadata value)
  applyRequiredRules();
});

