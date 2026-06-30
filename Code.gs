/**
 * 健身紀錄系統 - Google Apps Script 後端 (支援 40 種預設動作匯入版)
 */

function doGet(e) {
  if (e && e.parameter && e.parameter.action) {
    const action = e.parameter.action;
    let result = {};
    try {
      if (action === 'get') {
        const dateStr = e.parameter.date;
        result = { success: true, records: getRecordsByDate(dateStr) };
      } else if (action === 'menu') {
        result = { success: true, menu: getExerciseMenu() };
      } else {
        result = { success: false, error: "未知的 action 參數" };
      }
    } catch (err) {
      result = { success: false, error: err.message };
    }
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  }

  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('FitSheet - 專屬健身紀錄網頁介面')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  let result = {};
  try {
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;
    if (action === 'save') {
      const dateStr = postData.date;
      const workoutList = postData.workout;
      saveDayRecords(dateStr, workoutList);
      result = { success: true, message: "儲存成功" };
    } else {
      result = { success: false, error: "未知的 POST action" };
    }
  } catch (err) {
    result = { success: false, error: err.message };
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function getSpreadsheetUrl() {
  return SpreadsheetApp.getActiveSpreadsheet().getUrl();
}

// 40 種經典健身熱門動作名單
function getDefaultExercises() {
  return [
    // --- 徒手訓練 (Bodyweight) ---
    ["引體向上 (Pull-Up)", "徒手訓練 (Bodyweight)"],
    ["伏地挺身 (Push-Up)", "徒手訓練 (Bodyweight)"],
    ["雙槓撐體 (Dips)", "徒手訓練 (Bodyweight)"],
    ["徒手深蹲 (Bodyweight Squat)", "徒手訓練 (Bodyweight)"],
    ["懸掛抬腿 (Hanging Leg Raise)", "徒手訓練 (Bodyweight)"],
    ["羅馬椅背部伸展 (Hyperextension)", "徒手訓練 (Bodyweight)"],
    ["仰臥起坐 (Sit-Up)", "徒手訓練 (Bodyweight)"],
    ["棒式撐體 (Plank)", "徒手訓練 (Bodyweight)"],
    ["波比跳 (Burpees)", "徒手訓練 (Bodyweight)"],
    ["徒手保加利亞蹲 (Bodyweight Split Squat)", "徒手訓練 (Bodyweight)"],

    // --- 自由重量 (Free Weights) ---
    ["槓鈴平貼臥推 (Barbell Bench Press)", "自由重量 (Free Weights)"],
    ["啞鈴上斜臥推 (Incline Dumbbell Press)", "自由重量 (Free Weights)"],
    ["槓鈴深蹲 (Barbell Squat)", "自由重量 (Free Weights)"],
    ["羅馬尼亞硬舉 (Romanian Deadlift)", "自由重量 (Free Weights)"],
    ["啞鈴單臂划船 (Single-Arm Dumbbell Row)", "自由重量 (Free Weights)"],
    ["槓鈴划船 (Barbell Row)", "自由重量 (Free Weights)"],
    ["啞鈴肩推 (Dumbbell Shoulder Press)", "自由重量 (Free Weights)"],
    ["啞鈴側平舉 (Dumbbell Lateral Raise)", "自由重量 (Free Weights)"],
    ["啞鈴二頭肌彎舉 (Dumbbell Bicep Curl)", "自由重量 (Free Weights)"],
    ["啞鈴錘式彎舉 (Dumbbell Hammer Curl)", "自由重量 (Free Weights)"],

    // --- 機械器材 (Machines) ---
    ["機械胸推機 (Chest Press Machine)", "機械器材 (Machines)"],
    ["蝴蝶機夾胸 (Pec Deck Flye)", "機械器材 (Machines)"],
    ["反向飛鳥機 (Reverse Flye Machine)", "機械器材 (Machines)"],
    ["機械腿推 (Leg Press Machine)", "機械器材 (Machines)"],
    ["機械腿伸展 (Leg Extension Machine)", "機械器材 (Machines)"],
    ["機械俯臥腿彎舉 (Lying Leg Curl Machine)", "機械器材 (Machines)"],
    ["史密斯深蹲 (Smith Machine Squat)", "機械器材 (Machines)"],
    ["機械座姿划船 (Seated Machine Row)", "機械器材 (Machines)"],
    ["機械肩推機 (Shoulder Press Machine)", "機械器材 (Machines)"],
    ["站姿提踵機 (Standing Calf Raise Machine)", "機械器材 (Machines)"],

    // --- 繩索訓練 (Cables) ---
    ["滑輪下拉 (Lat Pulldown)", "繩索訓練 (Cables)"],
    ["繩索夾胸 (Cable Crossover)", "繩索訓練 (Cables)"],
    ["繩索座姿划船 (Seated Cable Row)", "繩索訓練 (Cables)"],
    ["繩索三頭肌下拉 (Cable Tricep Pushdown)", "繩索訓練 (Cables)"],
    ["繩索面拉 (Cable Face Pull)", "繩索訓練 (Cables)"],
    ["繩索二頭肌彎舉 (Cable Bicep Curl)", "繩索訓練 (Cables)"],
    ["繩索側平舉 (Cable Lateral Raise)", "繩索訓練 (Cables)"],
    ["繩索腹肌下壓 (Cable Crunch)", "繩索訓練 (Cables)"],
    ["繩索臀部後踢 (Cable Glute Kickback)", "繩索訓練 (Cables)"],
    ["繩索直臂下壓 (Straight-Arm Cable Pulldown)", "繩索訓練 (Cables)"]
  ];
}

// 讀取試算表中的動作選單。如無此工作表，自動初始化並填入 40 個預設動作。
function getExerciseMenu() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('動作選單');
    if (!sheet) {
      sheet = ss.insertSheet('動作選單');
      sheet.appendRow(["常用動作名稱", "訓練肌群"]);
      const defaults = getDefaultExercises();
      sheet.getRange(2, 1, defaults.length, 2).setValues(defaults);
    }
    
    const data = sheet.getDataRange().getValues();
    const exercises = [];
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) {
        exercises.push({
          name: data[i][0].toString().trim(),
          group: data[i][1] ? data[i][1].toString().trim() : '未分類'
        });
      }
    }
    return exercises;
  } catch (e) {
    throw new Error("讀取動作選單失敗: " + e.message);
  }
}

// 提供網頁一鍵強制將動作選單工作表重置並填滿 40 個預設動作
function resetExerciseMenuToDefault() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('動作選單');
    if (!sheet) {
      sheet = ss.insertSheet('動作選單');
    } else {
      sheet.clearContents();
    }
    
    sheet.appendRow(["常用動作名稱", "訓練肌群"]);
    const defaults = getDefaultExercises();
    sheet.getRange(2, 1, defaults.length, 2).setValues(defaults);
    return { success: true };
  } catch (e) {
    throw new Error("重置預設動作選單失敗: " + e.message);
  }
}

// 新增自訂動作到試算表
function addCustomExerciseToSheet(name, group) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('動作選單');
    if (!sheet) {
      sheet = ss.insertSheet('動作選單');
      sheet.appendRow(["常用動作名稱", "訓練肌群"]);
    }
    sheet.appendRow([name, group]);
    return { success: true };
  } catch (e) {
    throw new Error("新增動作失敗: " + e.message);
  }
}

// 精準讀取特定日期紀錄
function getRecordsByDate(dateString) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('健身紀錄');
    if (!sheet) return [];
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];
    
    const recordsMap = {};
    const diffMap = {};
    const VALID_DIFF = ['easy', 'normal', 'hard'];
    const targetDate = cleanDateString(dateString);
    if (!targetDate) return [];

    for (let i = 1; i < data.length; i++) {
      if (!data[i][0]) continue;

      const rowDate = cleanDateString(data[i][0]);
      if (rowDate === targetDate) {
        const exerciseName = data[i][1].toString().trim();
        const weight = parseFloat(data[i][3]) || 0;
        const reps = parseInt(data[i][4]) || 0;
        const note = data[i][6] ? data[i][6].toString().trim() : '';
        // 難度位於第 8 欄 (索引 7)；舊資料無此欄時預設 normal
        let diff = data[i][7] ? data[i][7].toString().trim() : 'normal';
        if (VALID_DIFF.indexOf(diff) === -1) diff = 'normal';

        if (!recordsMap[exerciseName]) {
          recordsMap[exerciseName] = [];
          diffMap[exerciseName] = diff; // 以該動作第一列的難度為準
        }
        recordsMap[exerciseName].push({ weight: weight, reps: reps, note: note });
      }
    }

    const result = [];
    for (const key in recordsMap) {
      result.push({ name: key, sets: recordsMap[key], difficulty: diffMap[key] || 'normal' });
    }
    return result;
  } catch (e) {
    throw new Error("讀取當日紀錄失敗: " + e.message);
  }
}

// 高效覆寫當日紀錄
function saveDayRecords(dateString, workoutList) {
  try {
    const HEADER = ["日期", "動作名稱", "組數", "重量 (kg)", "次數 (下)", "估算 1RM (kg)", "備註", "難度"];
    const NUM_COLS = HEADER.length; // 8

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('健身紀錄');
    if (!sheet) {
      sheet = ss.insertSheet('健身紀錄');
      sheet.appendRow(HEADER);
    }

    const data = sheet.getDataRange().getValues();
    const rowsToKeep = [HEADER.slice()]; // 一律以新版 8 欄標題為準
    const targetDate = cleanDateString(dateString);
    if (!targetDate) throw new Error("無效的日期格式");

    for (let i = 1; i < data.length; i++) {
      if (!data[i][0]) continue;
      const rowDate = cleanDateString(data[i][0]);
      if (rowDate !== targetDate) {
        // 保留其他日期的列，並正規化為 8 欄 (舊資料無難度欄則補空)
        const row = data[i].slice(0, NUM_COLS);
        while (row.length < NUM_COLS) row.push('');
        rowsToKeep.push(row);
      }
    }

    workoutList.forEach(item => {
      const diff = item.difficulty || 'normal';
      item.sets.forEach((set, index) => {
        const rowNum = rowsToKeep.length + 1;
        const oneRmFormula = `=ROUND(D${rowNum}*(1+E${rowNum}/30),1)`;
        rowsToKeep.push([
          dateString,
          item.name,
          "第 " + (index + 1) + " 組",
          parseFloat(set.weight) || 0,
          parseInt(set.reps) || 0,
          oneRmFormula,
          set.note || "",
          diff
        ]);
      });
    });

    sheet.clearContents();
    sheet.getRange(1, 1, rowsToKeep.length, NUM_COLS).setValues(rowsToKeep);
    return { success: true };
  } catch (e) {
    throw new Error("儲存失敗: " + e.message);
  }
}

// === 使用者偏好設定 (存於「設定」工作表，A 欄 key、B 欄 value) ===
// 供前端跨裝置/雲端持久化主題、語言、背景等設定，解決 iOS 主畫面 App 本地儲存被清除的問題。
function getSettingsSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('設定');
  if (!sheet) {
    sheet = ss.insertSheet('設定');
    sheet.getRange(1, 1, 1, 2).setValues([['key', 'value']]);
  }
  return sheet;
}

function getUserSettings() {
  try {
    const sheet = getSettingsSheet_();
    const lastRow = sheet.getLastRow();
    const obj = {};
    if (lastRow >= 2) {
      const values = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
      values.forEach(function(row) {
        const key = String(row[0]).trim();
        if (key) obj[key] = row[1];
      });
    }
    return obj;
  } catch (e) {
    throw new Error("讀取設定失敗: " + e.message);
  }
}

function saveUserSettings(jsonString) {
  try {
    const settings = JSON.parse(jsonString);
    const sheet = getSettingsSheet_();
    const lastRow = sheet.getLastRow();
    if (lastRow >= 2) {
      sheet.getRange(2, 1, lastRow - 1, 2).clearContent(); // 清舊資料、保留標題列
    }
    const rows = Object.keys(settings).map(function(k) { return [k, settings[k]]; });
    if (rows.length > 0) {
      sheet.getRange(2, 1, rows.length, 2).setValues(rows);
    }
    return { success: true };
  } catch (e) {
    throw new Error("儲存設定失敗: " + e.message);
  }
}

// 輔助函式：統一日期格式為 "YYYY-MM-DD"
function cleanDateString(dateObj) {
  if (!dateObj) return "";
  if (dateObj instanceof Date) {
    if (isNaN(dateObj.getTime())) return "";
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return year + "-" + month + "-" + day;
  }
  const str = dateObj.toString().trim();
  if (!str) return "";
  if (str.includes('T')) return str.split('T')[0];
  const parts = str.split(' ');
  if (parts.length > 0 && parts[0].includes('-')) return parts[0];
  const timestamp = Date.parse(str);
  if (!isNaN(timestamp)) {
    const parsedDate = new Date(timestamp);
    const year = parsedDate.getFullYear();
    const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
    const day = String(parsedDate.getDate()).padStart(2, '0');
    return year + "-" + month + "-" + day;
  }
  return str;
}