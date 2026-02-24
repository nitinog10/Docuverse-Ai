'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  User,
  Bell,
  Palette,
  Volume2,
  Shield,
  CreditCard,
  LogOut,
  ChevronRight,
  Moon,
  Sun,
  Check,
} from 'lucide-react'
import { Sidebar } from '@/components/layout/Sidebar'
import { clsx } from 'clsx'
import { useUserStore } from '@/lib/store'

const voiceOptions = [
  { id: 'rachel', name: 'Rachel', description: 'Default female voice' },
  { id: 'antoni', name: 'Antoni', description: 'Male voice - good for technical content' },
  { id: 'bella', name: 'Bella', description: 'Young female voice' },
  { id: 'josh', name: 'Josh', description: 'Deep male voice' },
]

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('account')
  const user = useUserStore((s) => s.user)
  const [settings, setSettings] = useState({
    theme: 'dark',
    voice: 'rachel',
    playbackSpeed: 1,
    autoPlay: true,
    showTranscript: true,
    emailNotifications: true,
    walkthroughComplete: true,
    weeklyDigest: false,
  })

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const sections = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'audio', label: 'Audio & Playback', icon: Volume2 },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'billing', label: 'Billing', icon: CreditCard },
  ]

  return (
    <div className="min-h-screen bg-dv-bg flex">
      <Sidebar />

      <main className="flex-1 p-8 overflow-y-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-dv-text-muted">Manage your account and preferences</p>
        </div>

        <div className="flex gap-8">
          {/* Sidebar navigation */}
          <div className="w-64 flex-shrink-0">
            <div className="card p-2">
              {sections.map((section) => {
                const Icon = section.icon
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={clsx(
                      'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left',
                      activeSection === section.id
                        ? 'bg-dv-accent/10 text-dv-accent'
                        : 'text-dv-text-muted hover:bg-dv-elevated hover:text-dv-text'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{section.label}</span>
                  </button>
                )
              })}
            </div>

            <button className="w-full flex items-center gap-3 px-4 py-3 mt-4 text-dv-error hover:bg-dv-error/10 rounded-lg transition-colors">
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 max-w-2xl">
            {/* Account */}
            {activeSection === 'account' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="card p-6">
                  <h2 className="text-xl font-semibold mb-4">Profile</h2>
                  
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-20 h-20 rounded-full bg-dv-accent/20 flex items-center justify-center overflow-hidden">
                      {user?.avatarUrl ? (
                        <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-10 h-10 text-dv-accent" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{user?.username || 'User'}</p>
                      <p className="text-sm text-dv-text-muted">{user?.email || 'No email'}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-dv-text-muted mb-2">Username</label>
                      <input
                        type="text"
                        defaultValue={user?.username || ''}
                        className="input-field w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-dv-text-muted mb-2">Email</label>
                      <input
                        type="email"
                        defaultValue={user?.email || ''}
                        className="input-field w-full"
                      />
                    </div>
                  </div>

                  <button className="btn-primary mt-6">Save Changes</button>
                </div>

                <div className="card p-6">
                  <h2 className="text-xl font-semibold mb-4">Connected Accounts</h2>
                  
                  <div className="flex items-center justify-between p-4 rounded-lg bg-dv-bg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium">GitHub</p>
                        <p className="text-sm text-dv-text-muted">@{user?.username || 'user'}</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-dv-success/10 text-dv-success text-sm">
                      Connected
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Appearance */}
            {activeSection === 'appearance' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-6"
              >
                <h2 className="text-xl font-semibold mb-6">Appearance</h2>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-3">Theme</label>
                    <div className="flex gap-4">
                      {['dark', 'light', 'system'].map((theme) => (
                        <button
                          key={theme}
                          onClick={() => updateSetting('theme', theme)}
                          className={clsx(
                            'flex-1 p-4 rounded-xl border transition-colors capitalize',
                            settings.theme === theme
                              ? 'border-dv-accent bg-dv-accent/10'
                              : 'border-dv-border hover:border-dv-text-muted'
                          )}
                        >
                          <div className="flex items-center justify-center mb-2">
                            {theme === 'dark' && <Moon className="w-6 h-6" />}
                            {theme === 'light' && <Sun className="w-6 h-6" />}
                            {theme === 'system' && (
                              <div className="flex">
                                <Moon className="w-5 h-5" />
                                <Sun className="w-5 h-5" />
                              </div>
                            )}
                          </div>
                          <span className="text-sm">{theme}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Audio & Playback */}
            {activeSection === 'audio' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="card p-6">
                  <h2 className="text-xl font-semibold mb-6">Voice Selection</h2>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {voiceOptions.map((voice) => (
                      <button
                        key={voice.id}
                        onClick={() => updateSetting('voice', voice.id)}
                        className={clsx(
                          'p-4 rounded-xl border text-left transition-colors',
                          settings.voice === voice.id
                            ? 'border-dv-accent bg-dv-accent/10'
                            : 'border-dv-border hover:border-dv-text-muted'
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{voice.name}</span>
                          {settings.voice === voice.id && (
                            <Check className="w-5 h-5 text-dv-accent" />
                          )}
                        </div>
                        <p className="text-sm text-dv-text-muted">{voice.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="card p-6">
                  <h2 className="text-xl font-semibold mb-6">Playback Settings</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium">Default Playback Speed</label>
                        <span className="text-dv-accent">{settings.playbackSpeed}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="2"
                        step="0.25"
                        value={settings.playbackSpeed}
                        onChange={(e) => updateSetting('playbackSpeed', parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>

                    <ToggleSetting
                      label="Auto-play next segment"
                      description="Automatically continue to the next code section"
                      checked={settings.autoPlay}
                      onChange={(v) => updateSetting('autoPlay', v)}
                    />

                    <ToggleSetting
                      label="Show transcript"
                      description="Display narration text during playback"
                      checked={settings.showTranscript}
                      onChange={(v) => updateSetting('showTranscript', v)}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Notifications */}
            {activeSection === 'notifications' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-6"
              >
                <h2 className="text-xl font-semibold mb-6">Notifications</h2>
                
                <div className="space-y-6">
                  <ToggleSetting
                    label="Email notifications"
                    description="Receive updates via email"
                    checked={settings.emailNotifications}
                    onChange={(v) => updateSetting('emailNotifications', v)}
                  />

                  <ToggleSetting
                    label="Walkthrough complete"
                    description="Notify when walkthrough generation finishes"
                    checked={settings.walkthroughComplete}
                    onChange={(v) => updateSetting('walkthroughComplete', v)}
                  />

                  <ToggleSetting
                    label="Weekly digest"
                    description="Get a summary of your activity"
                    checked={settings.weeklyDigest}
                    onChange={(v) => updateSetting('weeklyDigest', v)}
                  />
                </div>
              </motion.div>
            )}

            {/* Security */}
            {activeSection === 'security' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-6"
              >
                <h2 className="text-xl font-semibold mb-6">Security</h2>
                
                <div className="space-y-4">
                  <button className="w-full flex items-center justify-between p-4 rounded-lg bg-dv-bg hover:bg-dv-elevated transition-colors">
                    <div>
                      <p className="font-medium">Two-factor authentication</p>
                      <p className="text-sm text-dv-text-muted">Add an extra layer of security</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-dv-text-muted" />
                  </button>

                  <button className="w-full flex items-center justify-between p-4 rounded-lg bg-dv-bg hover:bg-dv-elevated transition-colors">
                    <div>
                      <p className="font-medium">Active sessions</p>
                      <p className="text-sm text-dv-text-muted">Manage your logged-in devices</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-dv-text-muted" />
                  </button>

                  <button className="w-full flex items-center justify-between p-4 rounded-lg bg-dv-bg hover:bg-dv-elevated transition-colors">
                    <div>
                      <p className="font-medium">API tokens</p>
                      <p className="text-sm text-dv-text-muted">Manage access tokens</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-dv-text-muted" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Billing */}
            {activeSection === 'billing' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="card p-6">
                  <h2 className="text-xl font-semibold mb-4">Current Plan</h2>
                  
                  <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-dv-accent/20 to-dv-purple/20 border border-dv-accent/30">
                    <div>
                      <p className="text-xl font-bold">Free Plan</p>
                      <p className="text-dv-text-muted">5 walkthroughs per month</p>
                    </div>
                    <button className="btn-primary">
                      Upgrade to Pro
                    </button>
                  </div>
                </div>

                <div className="card p-6">
                  <h2 className="text-xl font-semibold mb-4">Usage</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-dv-text-muted">Walkthroughs</span>
                        <span>3 / 5</span>
                      </div>
                      <div className="h-2 bg-dv-elevated rounded-full overflow-hidden">
                        <div className="h-full w-3/5 bg-gradient-to-r from-dv-accent to-dv-purple rounded-full" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-dv-text-muted">Audio minutes</span>
                        <span>12 / 30</span>
                      </div>
                      <div className="h-2 bg-dv-elevated rounded-full overflow-hidden">
                        <div className="h-full w-2/5 bg-gradient-to-r from-dv-accent to-dv-purple rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

function ToggleSetting({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-sm text-dv-text-muted">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={clsx(
          'w-12 h-7 rounded-full transition-colors',
          checked ? 'bg-dv-accent' : 'bg-dv-elevated'
        )}
      >
        <motion.div
          className="w-5 h-5 rounded-full bg-white shadow-sm"
          animate={{ x: checked ? 26 : 4 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </button>
    </div>
  )
}

