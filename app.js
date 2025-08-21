// 여행 정산 앱 JavaScript

// 설정에서 값 가져오기 (config.js에서 로드됨)
let names = window.CONFIG?.PARTICIPANT_NAMES || [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
];
let aliases = window.CONFIG?.NAME_ALIASES || {};
const CURRENCY = window.CONFIG?.CURRENCY || "￥";
let payments = JSON.parse(localStorage.getItem("payments") || "[]"); // 브라우저 localStorage 사용해서 저장

function initializeFromURL() {
  const params = new URLSearchParams(window.location.search);
  const namesString = params.get("names");
  if (namesString) {
    names = namesString.split(",").map((name) => name.trim());
  }
}

function savePayments() {
  localStorage.setItem("payments", JSON.stringify(payments));
}

// 탭 넘기기
document.querySelectorAll("nav button").forEach((btn) => {
  btn.onclick = () => {
    document
      .querySelectorAll("nav button")
      .forEach((b) => b.classList.remove("active"));
    document
      .querySelectorAll("section")
      .forEach((s) => s.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
  };
});

// 결제자와 참여자 선택 버튼 렌더링
function renderSelectOptions() {
  const payerSelect = document.getElementById("payer");
  payerSelect.innerHTML = names.map((n) => `<option>${n}</option>`).join("");
  // 최근 결제자 기억해서 기본값으로 설정
  const lastPayer = localStorage.getItem("lastPayer");
  if (lastPayer && names.includes(lastPayer)) {
    payerSelect.value = lastPayer;
  }
  const participantsDiv = document.getElementById("participants");
  let html = "";
  names.forEach((n, i) => {
    html += `<button type="button" class="participant-btn" data-name="${n}">${n}</button>`;
  });
  html += `<button type="button" class="participant-btn" data-name="__all__">전체</button>`;
  participantsDiv.innerHTML = html;

  const btns = participantsDiv.querySelectorAll(".participant-btn");
  btns.forEach((btn) => {
    btn.onclick = function () {
      if (btn.dataset.name === "__all__") {
        const allBtn = btn;
        const selectedCount = participantsDiv.querySelectorAll(
          '.participant-btn.selected:not([data-name="__all__"])'
        ).length;
        if (selectedCount === names.length) {
          btns.forEach((b) => b.classList.remove("selected"));
        } else {
          btns.forEach((b) => {
            if (b.dataset.name !== "__all__") b.classList.add("selected");
          });
          allBtn.classList.add("selected");
        }
      } else {
        btn.classList.toggle("selected");
        const allBtn = participantsDiv.querySelector(
          '.participant-btn[data-name="__all__"]'
        );
        const selectedCount = participantsDiv.querySelectorAll(
          '.participant-btn.selected:not([data-name="__all__"])'
        ).length;
        if (selectedCount === names.length) {
          allBtn.classList.add("selected");
        } else {
          allBtn.classList.remove("selected");
        }
      }
    };
  });
}

// 결제 내역 렌더링
function renderRecords() {
  const list = document.getElementById("recordList");
  list.innerHTML = "";
  payments.forEach((p, idx) => {
    const div = document.createElement("div");
    div.className = "record";
    div.tabIndex = 0;
    div.innerHTML = `<b>${p.payer}</b> - ${p.amount}${CURRENCY}<br>
    메모: ${p.memo || ""}<br>
    참여자: ${p.participants.join(", ")}<br>
    <small>${p.date ? p.date : ""}</small><br>
    <button onclick="deletePayment(${idx});event.stopPropagation();">삭제</button>`;
    div.onclick = () => openDetailModal(idx);
    list.appendChild(div);
  });
}

function normalizeName(input) {
  if (names.includes(input)) {
    return input;
  }

  for (const [realName, aliasArray] of Object.entries(aliases)) {
    if (aliasArray.includes(input)) {
      return realName;
    }
  }

  return null;
}

// 자세히 보기(결제자/참가자/금액/메모 수정 가능)
function openDetailModal(idx) {
  const p = payments[idx];
  let modal = document.getElementById("recordDetailModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "recordDetailModal";
    modal.style.position = "fixed";
    modal.style.left = "0";
    modal.style.top = "0";
    modal.style.width = "100vw";
    modal.style.height = "100vh";
    modal.style.background = "rgba(0,0,0,0.5)";
    modal.style.display = "flex";
    modal.style.alignItems = "center";
    modal.style.justifyContent = "center";
    modal.style.zIndex = "9999";
    modal.innerHTML = `
      <div id="modalContent" style="background:#fff;padding:20px;border-radius:10px;max-width:95vw;max-height:90vh;overflow:auto;position:relative;">
        <button id="closeModalBtn" style="position:absolute;top:10px;right:10px;font-size:20px;">&times;</button>
        <h3>결제 내역 상세</h3>
        <label>결제자: <input id="modalPayer" style="width:100%"></label><br>
        <label>금액: <input id="modalAmount" type="number" style="width:100%"></label><br>
        <label>메모: <input id="modalMemo" style="width:100%"></label><br>
        <label>참여자(쉼표로 구분): <input id="modalParticipants" style="width:100%"></label><br>
        <label>날짜: <input id="modalDate" style="width:100%" readonly></label><br>
        <button id="saveModalBtn" style="width:100%;margin-top:10px;">수정 저장</button>
      </div>
    `;
    document.body.appendChild(modal);
  }
  document.getElementById("modalPayer").value = p.payer;
  document.getElementById("modalAmount").value = p.amount;
  document.getElementById("modalMemo").value = p.memo || "";
  document.getElementById("modalParticipants").value =
    p.participants.join(", ");
  document.getElementById("modalDate").value = p.date || "";

  modal.style.display = "flex";

  document.getElementById("closeModalBtn").onclick = () => {
    modal.style.display = "none";
  };

  document.getElementById("saveModalBtn").onclick = function () {
    const payerInput = document.getElementById("modalPayer").value;
    p.payer = normalizeName(payerInput);
    if (!p.payer) {
      alert("결제자 이름이 잘못되었습니다.");
      return;
    }
    p.amount = parseFloat(document.getElementById("modalAmount").value) || 0;
    p.memo = document.getElementById("modalMemo").value;
    // 참여자 입력값을 배열로 변환
    const newParticipants = document
      .getElementById("modalParticipants")
      .value.split(",")
      .map((s) => s.trim())
      .map((s) => normalizeName(s))
      .filter(Boolean);

    // 참여자 유효성 검사
    const invalid = newParticipants.filter((name) => !names.includes(name));
    if (invalid.length > 0) {
      alert(`존재하지 않는 참여자: ${invalid.join(", ")}`);
      return;
    }
    p.participants = newParticipants;
    savePayments();
    renderRecords();
    modal.style.display = "none";
  };
}

// 결제 내역 추가
document.getElementById("addPayment").onclick = () => {
  const payer = document.getElementById("payer").value;
  const amount = parseFloat(document.getElementById("amount").value);
  const memo = document.getElementById("memo").value;
  const participants = Array.from(
    document.querySelectorAll("#participants .participant-btn.selected")
  )
    .map((btn) => btn.dataset.name)
    .filter((name) => name !== "__all__");
  if (!amount && participants.length === 0) {
    alert("금액과 참여자를 입력하세요");
    return;
  } else if (!amount) {
    alert("금액을 입력하세요");
    return;
  } else if (participants.length === 0) {
    alert("참여자를 선택하세요");
    return;
  }

  let confirmMsg = "";
  if (participants.includes(payer)) {
    confirmMsg = `${participants.join(", ")}가 참가한 것이 맞습니까?`;
  } else {
    confirmMsg = `${participants.join(
      ", "
    )}가 참가하고 결제자는 참여하지 않은 것이 맞습니까?`;
  }
  if (!confirm(confirmMsg)) {
    return;
  }

  const now = new Date();
  const date = now.toLocaleString();

  payments.push({ payer, amount, participants, memo, date });
  savePayments();
  document.getElementById("amount").value = "";
  document.getElementById("memo").value = "";
  document
    .querySelectorAll("#participants .participant-btn")
    .forEach((btn) => btn.classList.remove("selected"));
  alert("추가됨");
  renderRecords();

  localStorage.setItem("lastPayer", payer);
};

// 클립보드 복사 기능
function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard
      .writeText(text)
      .then(() => alert("클립보드에 복사되었습니다."))
      .catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

// 클립보드 복사(모바일)
function fallbackCopy(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  try {
    document.execCommand("copy");
    alert("클립보드에 복사되었습니다.");
  } catch (e) {
    alert("클립보드 복사 실패");
  }
  document.body.removeChild(textarea);
}

// 데이터 내보내기(사진 제외)
document.getElementById("exportData").onclick = () => {
  const json = JSON.stringify(payments);
  document.getElementById("exportOutput").value = json;
  copyToClipboard(json);
};

// 결제 내역 정산
document.getElementById("calculateSettle").onclick = () => {
  try {
    const lines = document
      .getElementById("settleInput")
      .value.split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    let allPayments = [];
    lines.forEach((line) => {
      const arr = JSON.parse(line);
      if (Array.isArray(arr)) {
        allPayments = allPayments.concat(arr);
      } else {
        throw new Error("각 줄은 배열(JSON array)이어야 합니다.");
      }
    });

    // 정산 결과 계산
    const balances = {};
    names.forEach((n) => (balances[n] = 0));
    allPayments.forEach((p) => {
      const share = p.amount / p.participants.length;
      p.participants.forEach((person) => {
        balances[person] -= share;
      });
      balances[p.payer] += p.amount;
    });

    let result = "";
    names.forEach((n) => {
      if (balances[n] > 0.009) {
        result += `<span style="color:green">${n}: ${balances[n].toFixed(
          2
        )}${CURRENCY} 받아야 합니다</span><br>`;
      } else if (balances[n] < -0.009) {
        result += `<span style="color:red">${n}: ${Math.abs(
          balances[n]
        ).toFixed(2)}${CURRENCY} 줘야 합니다</span><br>`;
      } else {
        result += `${n}: 0<br>`;
      }
    });
    document.getElementById("settleResult").innerHTML = result;

    let allText = "";
    allPayments.forEach((p, idx) => {
      allText += `[${idx + 1}] ${p.date ? p.date + " " : ""}${p.payer} - ${
        p.amount
      }${CURRENCY}, 참여자: ${p.participants.join(", ")}${
        p.memo ? ", 메모: " + p.memo : ""
      }\n`;
    });
    document.getElementById("allPaymentsOutput").value = allText;

    // --- 각자 소비 내역(메모 포함) ---
    let spendText = "";
    names.forEach((n) => {
      let spend = 0;
      let details = [];
      allPayments.forEach((p) => {
        if (p.participants.includes(n)) {
          const share = p.amount / p.participants.length;
          spend += share;
          details.push(
            `${
              p.date ? parseInt(p.date.split(" ")[2], 10) + "일, " : ""
            }${share.toFixed(2)}${CURRENCY}` + (p.memo ? `, ${p.memo}` : "")
          );
        }
      });
      spendText += `\n${n}: ${spend.toFixed(2)}${CURRENCY}\n`;
      if (details.length > 0) {
        spendText += details.map((d) => `   ${d}`).join("\n") + "\n";
      }
    });

    let prev = document.getElementById("spendSummary");
    if (prev) prev.remove();

    const spendDiv = document.createElement("div");
    spendDiv.id = "spendSummary";
    spendDiv.innerHTML = `<h4>개별 소비내역</h4><pre style="background:#f8f8f8;padding:8px;">${spendText}</pre>`;
    document
      .getElementById("allPaymentsOutput")
      .parentNode.appendChild(spendDiv);
  } catch (e) {
    alert("각 줄에 올바른 JSON 배열을 붙여넣어야 합니다.\n\n" + e.message);
    document.getElementById("settleResult").textContent = "";
    document.getElementById("allPaymentsOutput").value = "";
    let prev = document.getElementById("spendSummary");
    if (prev) prev.remove();
  }
};

function deletePayment(idx) {
  if (confirm("정말로 이 결제 기록을 삭제할까요?")) {
    payments.splice(idx, 1);
    savePayments();
    renderRecords();
  }
}

// 결제 기록 모두 삭제
document.getElementById("deleteAll").onclick = () => {
  if (confirm("정말로 모든 기록을 삭제할까요?")) {
    payments = [];
    savePayments();
    renderRecords();
  }
};

document.getElementById("addSingleJson").onclick = () => {
  const input = document.getElementById("singleJsonInput");
  const value = input.value.trim();
  if (!value) {
    alert("JSON을 입력하세요.");
    return;
  }
  try {
    const arr = JSON.parse(value);
    if (!Array.isArray(arr)) {
      alert("JSON 배열만 입력할 수 있습니다.");
      return;
    }
    const settleInput = document.getElementById("settleInput");
    settleInput.value += (settleInput.value.trim() ? "\n" : "") + value;
    input.value = "";
  } catch (e) {
    alert("올바른 JSON 배열이 아닙니다.");
  }
};

// 페이지 로드시 실행
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("currencyMark").textContent = CURRENCY;
  initializeFromURL();
  renderSelectOptions();
  renderRecords();
});
