'use client'
import { useState, useEffect } from 'react'
import { ArrowLeftIcon, PlusIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

interface User {
  id: string
  username: string
  allowAdultMode: boolean
  isActive: boolean
  role: string
  createdAt: string
}

export default function UsersManager() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  
  // form state
  const [showAdd, setShowAdd] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editId, setEditId] = useState('')
  
  const [formName, setFormName] = useState('')
  const [formPass, setFormPass] = useState('')
  const [formAdult, setFormAdult] = useState(false)
  const [formActive, setFormActive] = useState(true)
  const [formRole, setFormRole] = useState('USER')
  const [filterUser, setFilterUser] = useState('All')
  
  const fetchUsers = async () => {
    setLoading(true)
    const res = await fetch('/api/users')
    if (res.ok) {
      setUsers(await res.json())
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const resetForm = () => {
    setFormName('')
    setFormPass('')
    setFormAdult(false)
    setFormActive(true)
    setFormRole('USER')
    setEditId('')
    setIsEditing(false)
    setShowAdd(false)
  }

  const handleEditClick = (u: User) => {
    setFormName(u.username)
    setFormPass('')
    setFormAdult(u.allowAdultMode)
    setFormActive(u.isActive)
    setFormRole(u.role)
    setEditId(u.id)
    setIsEditing(true)
    setShowAdd(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName) return
    
    if (isEditing) {
      await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: editId, 
          username: formName, 
          passwordHash: formPass, 
          allowAdultMode: formAdult,
          isActive: formActive,
          role: formRole
        })
      })
    } else {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: formName, 
          passwordHash: formPass, 
          allowAdultMode: formAdult,
          isActive: formActive,
          role: formRole
        })
      })
    }
    
    resetForm()
    fetchUsers()
  }

  const handleDelete = async (id: string, username: string) => {
    if (!confirm(`确定要永久删除用户 "${username}" 吗？此操作不可逆！`)) return
    await fetch(`/api/users?id=${id}`, { method: 'DELETE' })
    fetchUsers()
  }

  return (
    <div className="space-y-6 pb-24">
      <header className="flex items-center justify-between pt-2">
        <div className="flex items-center">
          <Link href="/settings" className="p-2 -ml-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition">
            <ArrowLeftIcon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </Link>
          <span className="ml-1 text-lg font-bold text-gray-800 dark:text-gray-200">用户管理</span>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => { if(!showAdd) resetForm(); setShowAdd(!showAdd) }}
            className="p-2 -mr-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition text-gray-500 dark:text-gray-400"
          >
            <PlusIcon className="w-6 h-6" />
          </button>
        </div>
      </header>

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4">
          <h2 className="text-lg font-medium hidden sm:block">当前用户列表</h2>
          
          <div className="flex bg-[#7d7d7d1f] p-1 rounded-xl self-start sm:self-auto overflow-x-auto custom-scrollbar">
             <button 
               className={`whitespace-nowrap px-3 sm:px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${filterUser === 'All' ? 'bg-white shadow-sm dark:bg-gray-800 text-gray-900 dark:text-gray-100' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'}`} 
               onClick={() => setFilterUser('All')}
             >所有用户</button>
             <button 
               className={`whitespace-nowrap px-3 sm:px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${filterUser === 'USER' ? 'bg-white shadow-sm dark:bg-gray-800 text-gray-900 dark:text-gray-100' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'}`} 
               onClick={() => setFilterUser('USER')}
             >普通用户</button>
             <button 
               className={`whitespace-nowrap px-3 sm:px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${filterUser === 'SAGE' ? 'bg-white shadow-sm dark:bg-gray-800 text-gray-900 dark:text-gray-100' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'}`} 
               onClick={() => setFilterUser('SAGE')}
             >圣贤用户</button>
             <button 
               className={`whitespace-nowrap px-3 sm:px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${filterUser === 'ADMIN' ? 'bg-white shadow-sm dark:bg-gray-800 text-gray-900 dark:text-gray-100' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'}`} 
               onClick={() => setFilterUser('ADMIN')}
             >管理员</button>
          </div>
        </div>
      </div>

      {showAdd && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-white/5 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-4 shadow-sm">
          <div>
            <label className="block text-xs text-gray-500 mb-1">登录账号</label>
            <input 
              required
              value={formName} onChange={e => setFormName(e.target.value)}
              className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-blue-500"
              placeholder="输入账号名"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">登录密码 {isEditing && '(不修改请留空)'}</label>
            <input 
              type="password"
              value={formPass} onChange={e => setFormPass(e.target.value)}
              className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ring-blue-500"
              placeholder={isEditing ? "留空则不修改密码" : "默认密码为 123456"}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
               <label className="block text-xs text-gray-500 mb-2">角色权限</label>
               <div className="flex space-x-4">
                 <label className="flex items-center space-x-2 text-sm cursor-pointer">
                    <input type="radio" checked={formRole === 'USER'} onChange={() => setFormRole('USER')} />
                    <span>普通</span>
                 </label>
                 <label className="flex items-center space-x-2 text-sm text-purple-600 dark:text-purple-400 cursor-pointer">
                    <input type="radio" checked={formRole === 'ADMIN'} onChange={() => setFormRole('ADMIN')} />
                    <span>管理</span>
                 </label>
               </div>
            </div>
            <div>
               <label className="block text-xs text-gray-500 mb-2">账号状态</label>
               <div className="flex space-x-4">
                 <label className="flex items-center space-x-2 text-sm text-green-600 dark:text-green-500 cursor-pointer">
                    <input type="radio" checked={formActive === true} onChange={() => setFormActive(true)} />
                    <span>正常</span>
                 </label>
                 <label className="flex items-center space-x-2 text-sm text-red-600 dark:text-red-500 cursor-pointer">
                    <input type="radio" checked={formActive === false} onChange={() => setFormActive(false)} />
                    <span>停用</span>
                 </label>
               </div>
            </div>
          </div>
          
          <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
             <label className="flex items-center space-x-2 text-sm font-medium cursor-pointer">
                <input type="checkbox" checked={formAdult} onChange={(e) => setFormAdult(e.target.checked)} className="w-4 h-4 rounded text-blue-500" />
                <span>允许开启圣贤模式 (满18岁)</span>
             </label>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button type="button" onClick={resetForm} className="px-4 py-1.5 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">取消</button>
            <button type="submit" className="px-4 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 shadow-sm">{isEditing ? '保存修改' : '确认添加'}</button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm text-center py-10">加载中...</p>
      ) : users.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-gray-200 dark:border-gray-800 rounded-3xl">
          <p className="text-gray-500">系统暂无用户</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {users.filter(u => {
             if (filterUser === 'All') return true
             if (filterUser === 'ADMIN') return u.role === 'ADMIN'
             if (filterUser === 'SAGE') return u.allowAdultMode === true
             if (filterUser === 'USER') return u.role === 'USER' && !u.allowAdultMode
             return true
          }).map(u => (
            <li key={u.id} className={`bg-white dark:bg-white/5 p-4 rounded-2xl shadow-sm border ${u.isActive ? 'border-gray-100 dark:border-gray-800/80' : 'border-red-200 bg-red-50 dark:bg-red-500/10 dark:border-red-900/50'} flex justify-between items-center group transition hover:-translate-y-0.5 hover:shadow-md`}>
              <div className="flex flex-col mr-4">
                <span className="font-medium text-gray-900 dark:text-gray-100 flex items-center space-x-2">
                  <span>{u.username}</span>
                  {u.role === 'ADMIN' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-purple-500 bg-purple-50 text-purple-600 dark:bg-purple-500/10">
                      ADMIN
                    </span>
                  )}
                  {!u.isActive && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-red-500 bg-red-50 text-red-600 dark:bg-red-500/10">
                      已停用
                    </span>
                  )}
                </span>
                <span className="text-xs text-gray-400 mt-1 flex space-x-2">
                  <span>圣贤区: {u.allowAdultMode ? '已授权' : '无权限'}</span>
                  <span>&bull;</span>
                  <span>{new Date(u.createdAt).toLocaleDateString()}</span>
                </span>
              </div>
              
              <div className="flex space-x-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition">
                <button 
                  type="button"
                  onClick={() => handleEditClick(u)}
                  className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-full transition"
                >
                  <PencilIcon className="w-5 h-5" />
                </button>
                <button 
                  type="button"
                  onClick={() => handleDelete(u.id, u.username)}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
