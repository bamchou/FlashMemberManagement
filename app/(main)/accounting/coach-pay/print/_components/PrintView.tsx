'use client'

import { useEffect } from 'react'
import type { CoachSummary } from '../../_components/CoachPayClient'

export default function PrintView({
  year,
  month,
  summaries,
  generatedAt,
}: {
  year: number
  month: number
  summaries: CoachSummary[]
  generatedAt: string
}) {
  useEffect(() => {
    document.title = `指導者バイト代明細_${year}年${month}月`
    return () => { document.title = 'BC FLASH メンバー管理' }
  }, [year, month])

  const totalAmount = summaries.reduce((s, c) => s + c.totalAmount, 0)
  const paidAmount = summaries.filter(c => c.payment).reduce((s, c) => s + (c.payment?.amount ?? 0), 0)

  return (
    <>
      {/* 印刷ボタン（印刷時は非表示） */}
      <div className="no-print flex gap-3 p-4 bg-white border-b border-gray-200 sticky top-0">
        <button
          type="button"
          onClick={() => window.print()}
          className="px-5 py-2 bg-[#1A3666] text-white text-sm font-bold rounded-lg hover:bg-[#2A52A0] transition-colors flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          印刷する
        </button>
        <a
          href={`/accounting/coach-pay?year=${year}&month=${month}`}
          className="px-5 py-2 border border-gray-300 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors"
        >
          ← 戻る
        </a>
      </div>

      {/* 印刷コンテンツ */}
      <div className="print-page">
        {/* ヘッダー */}
        <div className="print-header">
          <div>
            <h1 className="print-title">指導者バイト代明細</h1>
            <p className="print-subtitle">{year}年{month}月分</p>
          </div>
          <div className="print-meta">
            <p>発行日: {generatedAt}</p>
            <p>BC FLASH</p>
          </div>
        </div>

        {/* 明細テーブル */}
        <table className="print-table">
          <thead>
            <tr>
              <th className="print-th print-th-name">氏名</th>
              <th className="print-th print-th-num">練習<br />参加回数</th>
              <th className="print-th print-th-num">練習<br />単価</th>
              <th className="print-th print-th-num">大会帯同<br />回数</th>
              <th className="print-th print-th-num">大会帯同<br />（山分け）</th>
              <th className="print-th print-th-amount">合計</th>
              <th className="print-th print-th-status">支払状況</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map(coach => (
              <tr key={coach.id} className="print-tr">
                <td className="print-td print-td-name">
                  {coach.name}
                  {coach.hasMissingRate && <span className="print-warning">※単価未設定</span>}
                </td>
                <td className="print-td print-td-num">{coach.practiceCount}回</td>
                <td className="print-td print-td-num">
                  {coach.ratePractice != null ? `¥${coach.ratePractice.toLocaleString()}` : '—'}
                </td>
                <td className="print-td print-td-num">{coach.tournamentCount}回</td>
                <td className="print-td print-td-num">
                  {coach.tournamentCount > 0 ? (
                    <>
                      <span>¥{coach.tournamentPay.toLocaleString()}</span>
                      {coach.tournamentDetails.map((d, i) => (
                        <span key={i} className="block text-[9px] text-gray-400 leading-snug mt-0.5">
                          {new Date(d.startAt).toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric' })}
                          {' '}{d.title}（{d.memberCount}人×¥{d.feePerPerson.toLocaleString()}÷{d.attendeeCount}人{d.hasRemainder ? '・余り含む' : ''}）
                        </span>
                      ))}
                    </>
                  ) : '—'}
                </td>
                <td className="print-td print-td-amount">¥{coach.totalAmount.toLocaleString()}</td>
                <td className="print-td print-td-status">
                  {coach.payment ? (
                    <span className="print-paid">
                      支払済<br />
                      <span className="print-paid-date">
                        {new Date(coach.payment.paidAt).toLocaleDateString('ja-JP', {
                          timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric',
                        })}
                      </span>
                    </span>
                  ) : (
                    <span className="print-unpaid">未払い</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="print-total-row">
              <td colSpan={5} className="print-td print-td-total-label">合計</td>
              <td className="print-td print-td-amount print-td-total">¥{totalAmount.toLocaleString()}</td>
              <td className="print-td print-td-status">
                <span className="text-xs">支払済: ¥{paidAmount.toLocaleString()}</span>
              </td>
            </tr>
          </tfoot>
        </table>

        {/* 備考・承認欄 */}
        <div className="print-footer">
          <div className="print-sign-box">
            <p className="print-sign-label">確認</p>
            <div className="print-sign-area" />
          </div>
          <div className="print-sign-box">
            <p className="print-sign-label">承認</p>
            <div className="print-sign-area" />
          </div>
          <div className="print-note-box">
            <p className="print-sign-label">備考</p>
            <div className="print-note-area" />
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          header, nav { display: none !important; }
          main { padding: 0 !important; max-width: 100% !important; }
          body { background: white !important; margin: 0; }
          @page { size: A4; margin: 15mm 12mm; }
        }

        .print-page {
          max-width: 210mm;
          margin: 0 auto;
          padding: 24px;
          font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif;
          font-size: 12px;
          color: #1a1a1a;
        }

        .print-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 2px solid #1A3666;
        }

        .print-title {
          font-size: 20px;
          font-weight: bold;
          color: #1A3666;
          margin: 0 0 4px;
        }

        .print-subtitle {
          font-size: 14px;
          color: #555;
          margin: 0;
        }

        .print-meta {
          text-align: right;
          font-size: 11px;
          color: #555;
          line-height: 1.6;
        }

        .print-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 24px;
          font-size: 11px;
        }

        .print-th {
          background: #1A3666;
          color: white;
          padding: 7px 6px;
          text-align: center;
          font-weight: bold;
          border: 1px solid #1A3666;
          line-height: 1.3;
        }

        .print-th-name  { width: 18%; text-align: left; }
        .print-th-num   { width: 10%; }
        .print-th-amount { width: 13%; }
        .print-th-status { width: 11%; }

        .print-td {
          padding: 7px 6px;
          border: 1px solid #ccc;
          vertical-align: middle;
        }

        .print-tr:nth-child(even) .print-td { background: #f8f8f8; }

        .print-td-name   { text-align: left; font-weight: 600; }
        .print-td-num    { text-align: center; }
        .print-td-amount { text-align: right; font-weight: bold; }
        .print-td-status { text-align: center; font-size: 10px; }
        .print-td-total-label { text-align: right; font-weight: bold; padding-right: 10px; }
        .print-td-total  { font-size: 14px; color: #1A3666; }

        .print-total-row .print-td {
          background: #EEF2FF;
          border-top: 2px solid #1A3666;
        }

        .print-warning {
          display: block;
          font-size: 9px;
          color: #b45309;
          font-weight: normal;
          margin-top: 2px;
        }

        .print-paid { color: #166534; font-weight: bold; }
        .print-paid-date { font-size: 9px; font-weight: normal; color: #555; }
        .print-unpaid { color: #9ca3af; }

        .print-footer {
          display: flex;
          gap: 12px;
          margin-top: 8px;
        }

        .print-sign-box {
          flex: 0 0 80px;
        }

        .print-note-box {
          flex: 1;
        }

        .print-sign-label {
          font-size: 10px;
          color: #555;
          margin: 0 0 4px;
          font-weight: bold;
        }

        .print-sign-area {
          height: 60px;
          border: 1px solid #ccc;
          border-radius: 4px;
        }

        .print-note-area {
          height: 60px;
          border: 1px solid #ccc;
          border-radius: 4px;
        }
      `}</style>
    </>
  )
}
