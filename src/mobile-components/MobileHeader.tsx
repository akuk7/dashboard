import type { ReactNode } from 'react'

type Props = {
  title: string
  action?: ReactNode
}

const MobileHeader: React.FC<Props> = ({ title, action }) => (
  <div className="flex items-center justify-between px-4 py-4 border-b border-[#303030] sticky top-0 bg-black z-10">
    <h1 className="text-2xl font-bold text-white">{title}</h1>
    {action}
  </div>
)

export default MobileHeader
