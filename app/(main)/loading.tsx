import Spinner from './_components/Spinner'

// 画面遷移中の共通ローディング表示。
// 個別のloading.tsx（メンバー一覧・お知らせ等）があるページはそちらが優先される。
export default function MainLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-[#1A3666]">
      <Spinner className="w-10 h-10" />
      <p className="mt-3 text-sm font-semibold text-gray-400">読み込み中...</p>
    </div>
  )
}
