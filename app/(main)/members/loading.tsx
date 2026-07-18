export default function MembersLoading() {
  return (
    <div className="animate-pulse">
      {/* コーチエリア skeleton */}
      <div className="mb-8">
        <div className="h-5 w-16 bg-gray-200 rounded mb-3" />
        <div className="bg-white rounded-xl border-2 border-gray-100 p-5 flex items-center gap-4">
          <div className="w-12 h-16 rounded-xl bg-gray-200 shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-4 w-32 bg-gray-200 rounded" />
            <div className="h-3 w-24 bg-gray-100 rounded" />
            <div className="h-3 w-40 bg-gray-100 rounded" />
          </div>
        </div>
      </div>

      {/* メンバー一覧 skeleton */}
      <div className="flex items-center justify-between mb-4">
        <div className="h-7 w-32 bg-gray-200 rounded" />
      </div>
      <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 mb-4">
        <div className="h-5 w-20 bg-gray-200 rounded" />
      </div>
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
            <div className="w-12 h-16 rounded-xl bg-gray-200 shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-28 bg-gray-200 rounded" />
              <div className="h-3 w-20 bg-gray-100 rounded" />
              <div className="h-3 w-36 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
