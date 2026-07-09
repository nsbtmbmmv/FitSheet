# FitSheet 專屬智慧健身紀錄

一款以 **Google Apps Script + Google 試算表** 為後端、單頁網頁為前端的個人健身紀錄 Web App。用 Google 試算表當資料庫,免自架伺服器即可隨時記錄每日訓練。

## 主要功能

- **每日訓練紀錄**:依日期記錄各動作的組數、重量與次數,並儲存回 Google 試算表。
- **內建動作選單**:預設 40 種熱門健身動作(徒手訓練、自由重量、機械器材、繩索訓練四大分類),首次使用自動建立「動作選單」工作表並匯入。
- **行動裝置友善**:採用 Tailwind CSS 響應式介面,支援 iOS / Android PWA 主畫面加入,操作體驗接近原生 App。
- **可自訂主題色**:提供調色盤自訂功能。

## 技術架構

| 層級 | 技術 |
| --- | --- |
| 前端 | HTML + Tailwind CSS + Lucide Icons(`Index.html`) |
| 後端 | Google Apps Script(`Code.gs`) |
| 資料庫 | Google 試算表(Google Sheets) |

## 部署方式

1. 建立 Google 試算表,開啟 **擴充功能 → Apps Script**。
2. 將 `Code.gs` 與 `Index.html` 貼入專案。
3. 點選 **部署 → 新增部署作業 → 網頁應用程式**,即可取得專屬網址。

## 教學文件

詳細使用與設定教學請參考:[FitSheet 教學文件](https://docs.google.com/document/d/1L5gq2wpDGMVTlC2oKbH2a7TXt8V0jlqnbj20lzABuo8/edit?usp=sharing)
