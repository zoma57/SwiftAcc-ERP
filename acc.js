// ==========================================
// 1. Storage Management
// ==========================================
const getData = (key) => JSON.parse(localStorage.getItem(key) || '[]');
const setData = (key, data) => localStorage.setItem(key, JSON.stringify(data));

// ==========================================
// 2. إدارة الحسابات
// ==========================================
function saveAccount() {
    const code = document.getElementById('accCode').value.trim();
    const name = document.getElementById('accName').value.trim();
    const type = document.getElementById('accType').value;
    const opDebit = parseFloat(document.getElementById('opDebit').value) || 0;
    const opCredit = parseFloat(document.getElementById('opCredit').value) || 0;

    if (!code || !name) return alert('Please enter Account Code and Name!');

    let accounts = getData('accountsData');
    let existingIndex = accounts.findIndex(a => a.code.toString() === code.toString());

    let badge = 'badge-equity';
    if (type === 'ASSET') badge = 'badge-asset';
    else if (type === 'LIABILITY') badge = 'badge-equity';
    else if (type === 'REVENUE') badge = 'badge-revenue';
    else if (type === 'EXPENSE') badge = 'badge-expense';

    let newAcc = { code, name, type, badgeClass: badge, opDebit, opCredit };

    if (existingIndex >= 0) accounts[existingIndex] = newAcc;
    else accounts.push(newAcc);

    setData('accountsData', accounts);
    
    document.getElementById('accCode').value = '';
    document.getElementById('accName').value = '';
    document.getElementById('opDebit').value = '0.00';
    document.getElementById('opCredit').value = '0.00';
    
    displayAccounts();
}

function displayAccounts() {
    const tbody = document.getElementById('accountsBody');
    if (!tbody) return;
    const accounts = getData('accountsData');
    
    tbody.innerHTML = ""; 
    if (accounts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#a2a3b7;">No accounts found. Please add or import accounts.</td></tr>';
        return;
    }

    tbody.innerHTML = accounts.map(acc => {
        let oDeb = parseFloat(acc.opDebit) || 0;
        let oCre = parseFloat(acc.opCredit) || 0;
        return `
        <tr>
            <td><span class="badge-code">${acc.code}</span></td>
            <td style="font-weight:600">${acc.name}</td>
            <td><span class="${acc.badgeClass}">${acc.type}</span></td>
            <td style="color:#1bc5bd; font-weight:bold;">$${oDeb.toFixed(2)}</td>
            <td style="color:#f64e60; font-weight:bold;">$${oCre.toFixed(2)}</td>
            <td style="text-align: center;">
                <button class="btn-edit" onclick="editAccount('${acc.code.toString().trim()}')"><i class="fas fa-edit"></i></button>
                <button class="btn-sm-delete" onclick="deleteAcc('${acc.code.toString().trim()}')"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`
    }).join('');
}

function editAccount(codeToEdit) {
    const accounts = getData('accountsData');
    const acc = accounts.find(a => a.code.toString().trim() === codeToEdit.toString().trim());
    if (acc) {
        document.getElementById('accCode').value = acc.code;
        document.getElementById('accName').value = acc.name;
        document.getElementById('accType').value = acc.type;
        document.getElementById('opDebit').value = acc.opDebit || 0;
        document.getElementById('opCredit').value = acc.opCredit || 0;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function deleteAcc(code) {
    if (confirm('Are you sure you want to delete this account?')) {
        let accounts = getData('accountsData');
        accounts = accounts.filter(a => a.code.toString().trim() !== code.toString().trim());
        setData('accountsData', accounts);
        displayAccounts();
    }
}

function processCSV() {
    const fileInput = document.getElementById('csvFileInput');
    if (!fileInput.files[0]) return alert('الرجاء اختيار ملف CSV أولاً');

    const reader = new FileReader();
    reader.onload = (e) => {
        const rows = e.target.result.split('\n');
        let accounts = [];
        rows.forEach((row, index) => {
            if (row.trim() === '' || index === 0) return;
            const cols = row.split(',');
            if (cols.length >= 2) {
                let code = cols[0].trim(), name = cols[1].trim();
                let type = 'EQUITY', badge = 'badge-equity';
                if (code.startsWith('1')) { type = 'ASSET'; badge = 'badge-asset'; }
                else if (code.startsWith('2')) { type = 'LIABILITY'; badge = 'badge-equity'; }
                else if (code.startsWith('4')) { type = 'REVENUE'; badge = 'badge-revenue'; }
                else if (code.startsWith('3') || code.startsWith('5')) { type = 'EXPENSE'; badge = 'badge-expense'; }
                accounts.push({ code, name, type, badgeClass: badge, opDebit: 0, opCredit: 0 });
            }
        });
        setData('accountsData', accounts);
        alert('تم الاستيراد بنجاح!');
        location.reload();
    };
    reader.readAsText(fileInput.files[0], 'UTF-8');
}

// ==========================================
// 3. صفحة القيود (Journal Entry) - متحصنة ضد الأخطاء
// ==========================================
function populateDatalist() {
    const datalist = document.getElementById('accountsList');
    if (!datalist) return;
    const accounts = getData('accountsData');
    datalist.innerHTML = accounts.map(a => `<option value="${a.code}">${a.name}</option>`).join('');
}

function addJournalLine() {
    const tbody = document.getElementById('journalBody');
    if (!tbody) return;
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><input type="text" list="accountsList" class="form-input code-input" placeholder="e.g. 101001" oninput="fetchAcc(this)"></td>
        <td><input type="text" class="form-input name-input" readonly></td>
        <td><input type="text" class="form-input type-input" readonly></td>
        <td><input type="number" class="form-input debit-input" value="0.00" oninput="calcTotals()"></td>
        <td><input type="number" class="form-input credit-input" value="0.00" oninput="calcTotals()"></td>
    `;
    tbody.appendChild(tr);
}

function fetchAcc(input) {
    const accounts = getData('accountsData');
    const acc = accounts.find(a => a.code.toString() === input.value.trim());
    const row = input.closest('tr');
    if (acc) {
        row.querySelector('.name-input').value = acc.name;
        row.querySelector('.type-input').value = acc.type;
    } else {
        row.querySelector('.name-input').value = '';
        row.querySelector('.type-input').value = '';
    }
}

function calcTotals() {
    let d = 0, c = 0;
    document.querySelectorAll('.debit-input').forEach(i => d += parseFloat(i.value) || 0);
    document.querySelectorAll('.credit-input').forEach(i => c += parseFloat(i.value) || 0);
    
    const dEl = document.getElementById('totDebit');
    const cEl = document.getElementById('totCredit');
    const statusEl = document.getElementById('statusIndicator');
    const errorBox = document.getElementById('saveErrorMsg');
    
    if (errorBox) errorBox.style.display = 'none';

    if(dEl && cEl) {
        dEl.innerText = '$' + d.toFixed(2);
        cEl.innerText = '$' + c.toFixed(2);
        // استخدمنا Math.abs عشان نتجنب أخطاء الكسور العشرية
        if(Math.abs(d - c) < 0.01 && d > 0) statusEl.innerHTML = 'Status: <span style="color: #1bc5bd; font-weight: bold;">● Balanced</span>';
        else statusEl.innerHTML = 'Status: <span style="color: #f64e60; font-weight: bold;">● Unbalanced</span>';
    }
}

function saveJournal() {
    try {
        const dStr = document.getElementById('totDebit').innerText.replace('$', '').replace(/,/g, '');
        const cStr = document.getElementById('totCredit').innerText.replace('$', '').replace(/,/g, '');
        const d = parseFloat(dStr) || 0;
        const c = parseFloat(cStr) || 0;
        const errorBox = document.getElementById('saveErrorMsg');

        // لو القيد مش موزون أو بصفر
        if (Math.abs(d - c) > 0.01 || d === 0) {
            if(errorBox) errorBox.style.display = 'block'; 
            else alert("عذراً، القيد غير متوازن (المدين لا يساوي الدائن) أو قيمته صفر!");
            return; 
        }

        if(errorBox) errorBox.style.display = 'none';

        let entries = getData('journalData');
        let lines = [];
        document.querySelectorAll('#journalBody tr').forEach(r => {
            const codeInput = r.querySelector('.code-input');
            if(!codeInput) return;
            const code = codeInput.value.trim(); 
            const deb = parseFloat(r.querySelector('.debit-input').value) || 0;
            const cre = parseFloat(r.querySelector('.credit-input').value) || 0;
            if (code && (deb > 0 || cre > 0)) lines.push({ code: code, debit: deb, credit: cre });
        });

        if(lines.length === 0) return alert("الرجاء إدخال حسابات في القيد!");

        let jDateInput = document.getElementById('jDate');
        let jDescInput = document.getElementById('jDesc');

        entries.push({ 
            date: jDateInput ? jDateInput.value : new Date().toISOString().split('T')[0], 
            desc: jDescInput ? jDescInput.value : 'Journal Entry', 
            total: d, 
            lines: lines 
        });
        
        setData('journalData', entries);
        location.reload();

    } catch (error) {
        alert("حدث خطأ يمنع الحفظ، الرجاء التحقق من المدخلات: " + error.message);
        console.error(error);
    }
}

function renderSavedEntries() {
    const tbody = document.getElementById('savedEntriesBody');
    if (!tbody) return;
    const entries = getData('journalData');
    tbody.innerHTML = '';
    if(entries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #a2a3b7;">No saved entries found.</td></tr>';
        return;
    }
    entries.slice().reverse().forEach((entry, reverseIndex) => {
        const originalIndex = entries.length - 1 - reverseIndex;
        let safeTotal = parseFloat(entry.total) || 0;
        tbody.innerHTML += `
            <tr>
                <td style="font-weight: bold;">${entry.date || '-'}</td>
                <td>${entry.desc || '-'}</td>
                <td style="color: #1bc5bd; font-weight: bold;">$${safeTotal.toFixed(2)}</td>
                <td style="color: #f64e60; font-weight: bold;">$${safeTotal.toFixed(2)}</td>
                <td><button class="btn-delete" onclick="deleteEntry(${originalIndex})"><i class="fas fa-trash"></i> Delete</button></td>
            </tr>
        `;
    });
}

function deleteEntry(index) {
    if(confirm('Are you sure you want to delete this entry?')) {
        let entries = getData('journalData');
        entries.splice(index, 1);
        setData('journalData', entries);
        location.reload();
    }
}

// ==========================================
// 4. المحرك المحاسبي 
// ==========================================
function getBalances() {
    const accounts = getData('accountsData');
    const entries = getData('journalData');
    let balances = {};
    
    accounts.forEach(a => { 
        balances[a.code] = { 
            name: a.name, type: a.type, 
            debit: parseFloat(a.opDebit) || 0, credit: parseFloat(a.opCredit) || 0  
        }; 
    });
    
    entries.forEach(entry => { 
        if(entry.lines) {
            entry.lines.forEach(line => { 
                if (balances[line.code]) { 
                    balances[line.code].debit += parseFloat(line.debit || line.deb) || 0; 
                    balances[line.code].credit += parseFloat(line.credit || line.cre) || 0; 
                } 
            }); 
        }
    });
    return balances;
}

// ==========================================
// تهيئة الصفحة عند التحميل
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    displayAccounts();
    populateDatalist();
    renderSavedEntries();
    const balances = getBalances();

    // ------------------ ميزان المراجعة الممتد (بالشكل الجديد) ------------------
    const trialBody = document.getElementById('trialBody');
    if (trialBody) {
        function renderTrialBalance() {
            const accounts = getData('accountsData');
            const entries = getData('journalData');
            trialBody.innerHTML = "";

            let accStats = {};
            accounts.forEach(a => {
                accStats[a.code] = {
                    name: a.name, code: a.code.toString(), isLeaf: true,
                    begD: parseFloat(a.opDebit) || 0, begC: parseFloat(a.opCredit) || 0,
                    movD: 0, movC: 0
                };
            });

            accounts.forEach(a => {
                if (accounts.some(child => child.code.toString() !== a.code.toString() && child.code.toString().startsWith(a.code.toString()))) {
                    accStats[a.code].isLeaf = false; 
                }
            });

            entries.forEach(entry => {
                if(entry.lines) {
                    entry.lines.forEach(line => {
                        let c = line.code.toString();
                        if(accStats[c]) {
                            accStats[c].movD += parseFloat(line.debit || line.deb) || 0;
                            accStats[c].movC += parseFloat(line.credit || line.cre) || 0;
                        }
                    });
                }
            });

            let sortedCodesDesc = Object.keys(accStats).sort((a, b) => b.length - a.length);
            sortedCodesDesc.forEach(code => {
                let stat = accStats[code];
                let possibleParents = accounts.filter(p => code.startsWith(p.code.toString()) && p.code.toString() !== code);
                if (possibleParents.length > 0) {
                    possibleParents.sort((a, b) => b.code.toString().length - a.code.toString().length);
                    let directParentCode = possibleParents[0].code.toString();
                    if(accStats[directParentCode]) {
                        accStats[directParentCode].begD += stat.begD;
                        accStats[directParentCode].begC += stat.begC;
                        accStats[directParentCode].movD += stat.movD;
                        accStats[directParentCode].movC += stat.movC;
                    }
                }
            });

            Object.values(accStats).forEach(stat => {
                stat.totD = stat.begD + stat.movD;
                stat.totC = stat.begC + stat.movC;
                let net = stat.totD - stat.totC;
                stat.balD = net > 0 ? net : 0;
                stat.balC = net < 0 ? Math.abs(net) : 0;
            });

            let displayCodes = Object.keys(accStats).sort((a, b) => a.localeCompare(b));
            let foot = { bD:0, bC:0, mD:0, mC:0, tD:0, tC:0, baD:0, baC:0 };

            displayCodes.forEach(code => {
                let s = accStats[code];
                if (s.begD === 0 && s.begC === 0 && s.movD === 0 && s.movC === 0) return;

                let nameHTML = '';
                let rowClass = !s.isLeaf ? 'tree-parent' : '';

                if (!s.isLeaf) {
                    nameHTML = `
                        <div style="font-size: 13px; font-weight: 800; color: #3f4254; padding: 4px 0;">
                            <i class="fas fa-folder-open" style="color: #a2a3b7; margin-right: 5px;"></i> ${s.name} <span style="font-size:10px; color:#b5b5c3; font-weight:normal;">(إجمالي تجميعي)</span>
                        </div>
                    `;
                } else {
                    let hierarchy = accounts.filter(parent => code.startsWith(parent.code.toString()) && parent.code.toString() !== code);
                    hierarchy.sort((p1, p2) => p1.code.toString().length - p2.code.toString().length);
                    
                    let rootsHTML = hierarchy.map(p => `[${p.code}] ${p.name}`).join(' <i class="fas fa-angle-double-right" style="font-size:9px; margin:0 3px; color:#d1d5db;"></i> ');
                    if(rootsHTML !== "") rootsHTML += ' <i class="fas fa-angle-double-right" style="font-size:9px; margin:0 3px; color:#d1d5db;"></i> ';
                    
                    nameHTML = `
                        <div style="font-size: 11px; color: #a2a3b7; margin-bottom: 6px;">
                            <i class="fas fa-sitemap"></i> ${rootsHTML}
                        </div>
                        <div style="font-size: 13px; font-weight: 900; color: #1e1e2d; background: #e1e9ff; padding: 8px 12px; border-radius: 6px; border-left: 4px solid #5d78ff; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                            <i class="fas fa-edit" style="color: #5d78ff; margin-right: 5px;"></i> ${s.name}
                        </div>
                        <div style="margin-top: 6px;">
                            <button class="btn-trace" style="font-size: 10px; padding: 4px 8px; background: white; border: 1px solid #d1d5db;" onclick="showLedger('${code}')"><i class="fas fa-list"></i> كشف الحساب</button>
                        </div>
                    `;
                }

                let bD_HTML = s.isLeaf ? `<input type="number" class="editable-input" style="color:#1bc5bd" value="${s.begD.toFixed(2)}" onchange="updateBeginningBalance('${code}', 'opDebit', this.value)">` : `<span style="color:#1bc5bd">${s.begD.toFixed(2)}</span>`;
                let bC_HTML = s.isLeaf ? `<input type="number" class="editable-input" style="color:#f64e60" value="${s.begC.toFixed(2)}" onchange="updateBeginningBalance('${code}', 'opCredit', this.value)">` : `<span style="color:#f64e60">${s.begC.toFixed(2)}</span>`;

                trialBody.innerHTML += `
                    <tr class="${rowClass}">
                        <td style="vertical-align: middle;"><span class="badge-code">${code}</span></td>
                        <td style="vertical-align: middle;">${nameHTML}</td>
                        <td style="background: #f0fdf4; vertical-align: middle;" class="table-amount">${bD_HTML}</td>
                        <td style="background: #fef2f2; vertical-align: middle;" class="table-amount">${bC_HTML}</td>
                        <td class="table-amount" style="color:#1bc5bd; vertical-align: middle;">${s.movD > 0 ? s.movD.toFixed(2) : '-'}</td>
                        <td class="table-amount" style="color:#f64e60; vertical-align: middle;">${s.movC > 0 ? s.movC.toFixed(2) : '-'}</td>
                        <td class="table-amount" style="color:#1bc5bd; vertical-align: middle;">${s.totD.toFixed(2)}</td>
                        <td class="table-amount" style="color:#f64e60; vertical-align: middle;">${s.totC.toFixed(2)}</td>
                        <td class="table-amount" style="color:#1bc5bd; font-weight:900; vertical-align: middle;">${s.balD > 0 ? s.balD.toFixed(2) : '-'}</td>
                        <td class="table-amount" style="color:#f64e60; font-weight:900; vertical-align: middle;">${s.balC > 0 ? s.balC.toFixed(2) : '-'}</td>
                    </tr>
                `;

                let hasParent = accounts.some(p => code.startsWith(p.code.toString()) && p.code.toString() !== code);
                if (!hasParent) {
                    foot.bD += s.begD; foot.bC += s.begC;
                    foot.mD += s.movD; foot.mC += s.movC;
                    foot.tD += s.totD; foot.tC += s.totC;
                    foot.baD += s.balD; foot.baC += s.balC;
                }
            });

            if(trialBody.innerHTML === "") trialBody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding: 30px; color:#a2a3b7; font-weight:bold;">لا توجد حسابات نشطة. قم بتسجيل قيود أو أرصدة لتظهر هنا.</td></tr>`;

            document.getElementById('f-begD').innerText = '$' + foot.bD.toFixed(2); document.getElementById('f-begC').innerText = '$' + foot.bC.toFixed(2);
            document.getElementById('f-movD').innerText = '$' + foot.mD.toFixed(2); document.getElementById('f-movC').innerText = '$' + foot.mC.toFixed(2);
            document.getElementById('f-totD').innerText = '$' + foot.tD.toFixed(2); document.getElementById('f-totC').innerText = '$' + foot.tC.toFixed(2);
            document.getElementById('f-balD').innerText = '$' + foot.baD.toFixed(2); document.getElementById('f-balC').innerText = '$' + foot.baC.toFixed(2);
        }

        renderTrialBalance();

        window.updateBeginningBalance = function(code, field, value) {
            let accounts = getData('accountsData');
            let index = accounts.findIndex(a => a.code.toString() === code.toString());
            if (index !== -1) {
                accounts[index][field] = parseFloat(value) || 0;
                setData('accountsData', accounts);
                renderTrialBalance(); 
            }
        };
    }

    // ------------------ قائمة الدخل ------------------
    if (document.getElementById('incRev')) {
        let r = 0, e = 0;
        document.getElementById('incRev').innerHTML = ""; document.getElementById('incExp').innerHTML = "";
        for (let code in balances) {
            const b = balances[code];
            if (b.type === 'REVENUE' && (b.credit - b.debit) > 0) { let val = b.credit - b.debit; document.getElementById('incRev').innerHTML += `<div class="report-row"><span>${b.name}</span><span>$${val.toFixed(2)}</span></div>`; r += val; }
            if (b.type === 'EXPENSE' && (b.debit - b.credit) > 0) { let val = b.debit - b.credit; document.getElementById('incExp').innerHTML += `<div class="report-row"><span>${b.name}</span><span>$${val.toFixed(2)}</span></div>`; e += val; }
        }
        document.getElementById('totRev').innerText = '$' + r.toFixed(2); document.getElementById('totExp').innerText = '$' + e.toFixed(2);
        const net = r - e; document.getElementById('netInc').innerText = '$' + net.toFixed(2);
        document.getElementById('netInc').style.color = net >= 0 ? '#1bc5bd' : '#f64e60';
        localStorage.setItem('tempNet', net);
    }

    // ------------------ الميزانية العمومية ------------------
    if (document.getElementById('bsAssets')) {
        let aTotal = 0, l_eTotal = 0;
        document.getElementById('bsAssets').innerHTML = ""; document.getElementById('bsLiab').innerHTML = ""; document.getElementById('bsEq').innerHTML = "";
        for (let code in balances) {
            const b = balances[code]; const net = b.debit - b.credit;
            if (b.type === 'ASSET' && net !== 0) { document.getElementById('bsAssets').innerHTML += `<div class="report-row"><span>${b.name}</span><span>$${net.toFixed(2)}</span></div>`; aTotal += net; } 
            else if (b.type === 'LIABILITY' && net !== 0) { document.getElementById('bsLiab').innerHTML += `<div class="report-row"><span>${b.name}</span><span>$${Math.abs(net).toFixed(2)}</span></div>`; l_eTotal += Math.abs(net); } 
            else if (b.type === 'EQUITY' && net !== 0) { document.getElementById('bsEq').innerHTML += `<div class="report-row"><span>${b.name}</span><span>$${Math.abs(net).toFixed(2)}</span></div>`; l_eTotal += Math.abs(net); }
        }
        const netProfit = parseFloat(localStorage.getItem('tempNet') || 0);
        document.getElementById('bsEq').innerHTML += `<div class="report-row" style="color:#5d78ff; font-weight: bold; background: #f8f9fb; padding: 10px; border-radius: 5px;"><span>صافي الربح</span><span>$${netProfit.toFixed(2)}</span></div>`;
        document.getElementById('totAst').innerText = '$' + aTotal.toFixed(2);
        document.getElementById('totLiabEq').innerText = '$' + (l_eTotal + netProfit).toFixed(2);
    }
});

// ==========================================
// 5. شجرة تتبع الحساب (Ledger Drill-down)
// ==========================================
function showLedger(code) {
    const accounts = getData('accountsData');
    const entries = getData('journalData');
    const acc = accounts.find(a => a.code.toString() === code.toString());
    if(!acc) return;

    let hierarchy = accounts.filter(a => code.toString().startsWith(a.code.toString()) && a.code.toString() !== code.toString());
    hierarchy.sort((a, b) => a.code.toString().length - b.code.toString().length);
    
    let treeHTML = `<div style="background: #f8f9fb; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px dashed #d1d5db; text-align: left;">
        <h4 style="margin-top: 0; color: #3f4254; font-size: 13px; margin-bottom: 10px;"><i class="fas fa-sitemap"></i> Account Hierarchy (التسلسل الشجري)</h4>
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 13px; font-weight: bold;">`;
    
    if(hierarchy.length === 0) treeHTML += `<span style="color: #a2a3b7;">Root Account (حساب رئيسي)</span>`;
    else {
        hierarchy.forEach(parent => {
            treeHTML += `<span style="color: #7e8299;">[${parent.code}] ${parent.name}</span> <i class="fas fa-chevron-right" style="color: #b5b5c3; font-size: 10px;"></i> `;
        });
    }
    treeHTML += `<span style="color: #1e1e2d; background: #e1e9ff; padding: 4px 8px; border-radius: 4px; border: 1px solid #5d78ff;">[${acc.code}] ${acc.name}</span>
        </div></div>`;

    document.getElementById('modalAccName').innerHTML = `${acc.code} - ${acc.name}`;
    
    let treeContainer = document.getElementById('hierarchyTreeContainer');
    if (!treeContainer) {
        treeContainer = document.createElement('div');
        treeContainer.id = 'hierarchyTreeContainer';
        const titleEl = document.getElementById('modalAccName');
        titleEl.parentNode.insertBefore(treeContainer, titleEl.nextSibling);
    }
    treeContainer.innerHTML = treeHTML;

    const tbody = document.getElementById('ledgerBody');
    tbody.innerHTML = '';

    let runningBalance = 0;
    let opD = parseFloat(acc.opDebit) || 0;
    let opC = parseFloat(acc.opCredit) || 0;

    const isDebitNature = (acc.type === 'ASSET' || acc.type === 'EXPENSE');
    runningBalance = isDebitNature ? (opD - opC) : (opC - opD);

    tbody.innerHTML += `
        <tr style="background: #f8f9fb;">
            <td style="font-weight: bold; color: #a2a3b7;">Beginning</td>
            <td style="color: #5d78ff; font-weight: bold;"><i class="fas fa-flag"></i> Beginning Balance (رصيد أول المدة)</td>
            <td style="color: #1bc5bd;">$${opD.toFixed(2)}</td>
            <td style="color: #f64e60;">$${opC.toFixed(2)}</td>
            <td style="font-weight: 900; background: #e1e9ff; color: #1e1e2d;">$${runningBalance.toFixed(2)}</td>
        </tr>
    `;

    entries.forEach(entry => {
        let entryDebit = 0, entryCredit = 0;
        let foundInEntry = false;
        
        entry.lines.forEach(line => {
            if(line.code.toString() === code.toString()) {
                entryDebit += parseFloat(line.debit || line.deb) || 0;
                entryCredit += parseFloat(line.credit || line.cre) || 0;
                foundInEntry = true;
            }
        });

        if(foundInEntry) {
            if (isDebitNature) runningBalance += (entryDebit - entryCredit);
            else runningBalance += (entryCredit - entryDebit);
            
            tbody.innerHTML += `
                <tr>
                    <td>${entry.date || 'N/A'}</td>
                    <td>${entry.desc || 'Journal Entry'}</td>
                    <td style="color: #1bc5bd;">$${entryDebit > 0 ? entryDebit.toFixed(2) : '-'}</td>
                    <td style="color: #f64e60;">$${entryCredit > 0 ? entryCredit.toFixed(2) : '-'}</td>
                    <td style="font-weight: bold;">$${runningBalance.toFixed(2)}</td>
                </tr>
            `;
        }
    });

    document.getElementById('ledgerModal').style.display = 'flex';
}

// ==========================================
// 6. دوال إغلاق النافذة المنبثقة
// ==========================================
window.closeModal = function() {
    const modal = document.getElementById('ledgerModal');
    if (modal) modal.style.display = 'none';
};

window.addEventListener('click', function(event) {
    const modal = document.getElementById('ledgerModal');
    if (event.target === modal) modal.style.display = 'none';
});