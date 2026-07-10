import LoginForm from './LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#F5C800] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden">

        {/* ヘッダー */}
        <div className="bg-[#1A3666] px-8 py-8 text-center">
          <div className="text-4xl mb-3">🏸</div>
          <h1 className="text-white font-bold text-base leading-relaxed tracking-wide">
            バドミントンクラブ
            <br />
            メンバー管理システム
          </h1>
        </div>

        {/* フォーム */}
        <div className="px-8 py-7">
          <p className="text-sm text-gray-500 mb-5 text-center">
            ログインしてください
          </p>
          <LoginForm />
        </div>

      </div>
    </div>
  )
}
