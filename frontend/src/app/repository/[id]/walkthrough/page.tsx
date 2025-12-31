'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { WalkthroughPlayer } from '@/components/walkthrough/WalkthroughPlayer'
import { FileExplorer } from '@/components/walkthrough/FileExplorer'
import { DiagramPanel } from '@/components/walkthrough/DiagramPanel'
import { SandboxPanel } from '@/components/walkthrough/SandboxPanel'
import {
  ArrowLeft,
  Layers,
  Code2,
  FileCode,
  GitBranch,
  Terminal,
  LayoutGrid,
} from 'lucide-react'
import Link from 'next/link'
import { clsx } from 'clsx'

// Mock file tree data
const mockFileTree = [
  {
    id: 'src',
    path: 'src',
    name: 'src',
    isDirectory: true,
    children: [
      {
        id: 'src_auth',
        path: 'src/auth',
        name: 'auth',
        isDirectory: true,
        children: [
          { id: 'auth_flow', path: 'src/auth/auth_flow.py', name: 'auth_flow.py', isDirectory: false, language: 'python' },
          { id: 'jwt_handler', path: 'src/auth/jwt_handler.py', name: 'jwt_handler.py', isDirectory: false, language: 'python' },
          { id: 'oauth', path: 'src/auth/oauth.py', name: 'oauth.py', isDirectory: false, language: 'python' },
        ],
      },
      {
        id: 'src_api',
        path: 'src/api',
        name: 'api',
        isDirectory: true,
        children: [
          { id: 'routes', path: 'src/api/routes.py', name: 'routes.py', isDirectory: false, language: 'python' },
          { id: 'middleware', path: 'src/api/middleware.py', name: 'middleware.py', isDirectory: false, language: 'python' },
        ],
      },
      { id: 'main', path: 'src/main.py', name: 'main.py', isDirectory: false, language: 'python' },
      { id: 'config', path: 'src/config.py', name: 'config.py', isDirectory: false, language: 'python' },
    ],
  },
  {
    id: 'tests',
    path: 'tests',
    name: 'tests',
    isDirectory: true,
    children: [
      { id: 'test_auth', path: 'tests/test_auth.py', name: 'test_auth.py', isDirectory: false, language: 'python' },
    ],
  },
]

// Mock code content
const mockCodeContent = `"""
Authentication Flow Module
Handles user authentication via JWT tokens
"""

from datetime import datetime, timedelta
from typing import Optional
from jose import jwt, JWTError
from passlib.context import CryptContext
from .models import User, TokenData
from .database import get_user_by_email

# Security configuration
SECRET_KEY = "your-secret-key-here"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Generate password hash using bcrypt."""
    return pwd_context.hash(password)


def create_access_token(
    data: dict, 
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create a JWT access token.
    
    Args:
        data: Payload data to encode
        expires_delta: Token expiration time
        
    Returns:
        Encoded JWT token string
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    
    return encoded_jwt


async def authenticate_user(email: str, password: str) -> Optional[User]:
    """
    Authenticate a user with email and password.
    
    This function retrieves the user from the database,
    verifies the password, and returns the user if valid.
    """
    user = await get_user_by_email(email)
    
    if not user:
        return None
    
    if not verify_password(password, user.hashed_password):
        return None
    
    return user


async def get_current_user(token: str) -> User:
    """
    Decode JWT token and return the current user.
    
    Raises:
        InvalidCredentials: If token is invalid or expired
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        
        if email is None:
            raise InvalidCredentials()
            
        token_data = TokenData(email=email)
        
    except JWTError:
        raise InvalidCredentials()
    
    user = await get_user_by_email(token_data.email)
    
    if user is None:
        raise InvalidCredentials()
    
    return user
`

// Mock walkthrough script
const mockWalkthroughScript = {
  id: 'wt_demo',
  filePath: 'src/auth/auth_flow.py',
  title: 'Authentication Flow Walkthrough',
  summary: 'Complete walkthrough of the authentication system including JWT tokens and password hashing.',
  totalDuration: 245, // seconds
  segments: [
    {
      id: 'seg_1',
      order: 0,
      text: "Welcome to the walkthrough of auth_flow.py. This file is the heart of our authentication system. It handles everything from password hashing to JWT token management. Let's explore how it all works together.",
      startLine: 1,
      endLine: 11,
      highlightLines: [1, 2, 3, 4, 5, 6, 7, 8],
      durationEstimate: 18,
    },
    {
      id: 'seg_2',
      order: 1,
      text: "Here we have our security configuration. The SECRET_KEY should be kept secure and stored in environment variables in production. We're using the HS256 algorithm for JWT signing, which provides a good balance of security and performance.",
      startLine: 12,
      endLine: 18,
      highlightLines: [12, 13, 14, 15, 16, 17, 18],
      durationEstimate: 20,
    },
    {
      id: 'seg_3',
      order: 2,
      text: "The verify_password function uses bcrypt through Passlib's CryptContext. Bcrypt is a proven password hashing algorithm that automatically handles salting and is resistant to rainbow table attacks.",
      startLine: 21,
      endLine: 24,
      highlightLines: [21, 22, 23, 24],
      durationEstimate: 18,
    },
    {
      id: 'seg_4',
      order: 3,
      text: "The create_access_token function is where JWT magic happens. It takes the user data, adds an expiration timestamp, and encodes it all into a secure token. Notice how we handle both custom and default expiration times.",
      startLine: 31,
      endLine: 50,
      highlightLines: [31, 32, 33, 34, 35, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50],
      durationEstimate: 25,
    },
    {
      id: 'seg_5',
      order: 4,
      text: "The authenticate_user function ties it all together. It fetches the user from the database, verifies the password, and returns the user object if everything checks out. This is the main entry point for login operations.",
      startLine: 53,
      endLine: 68,
      highlightLines: [53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68],
      durationEstimate: 22,
    },
    {
      id: 'seg_6',
      order: 5,
      text: "Finally, get_current_user decodes the JWT token to retrieve the authenticated user. It handles all the error cases gracefully, raising InvalidCredentials when the token is expired, malformed, or the user doesn't exist.",
      startLine: 71,
      endLine: 92,
      highlightLines: [71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92],
      durationEstimate: 24,
    },
  ],
}

type PanelType = 'files' | 'diagram' | 'sandbox'

export default function WalkthroughPage({ params }: { params: { id: string } }) {
  const [selectedFile, setSelectedFile] = useState('src/auth/auth_flow.py')
  const [activePanel, setActivePanel] = useState<PanelType>('files')
  const [isPlaying, setIsPlaying] = useState(false)

  return (
    <div className="h-screen bg-dv-bg flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-dv-border bg-dv-surface">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="p-2 rounded-lg hover:bg-dv-elevated transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-dv-text-muted" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-dv-accent/20 flex items-center justify-center">
              <GitBranch className="w-4 h-4 text-dv-accent" />
            </div>
            <div>
              <h1 className="font-semibold">docuverse-core</h1>
              <p className="text-sm text-dv-text-muted">{selectedFile}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <PanelButton
            active={activePanel === 'files'}
            onClick={() => setActivePanel('files')}
            icon={<FileCode className="w-4 h-4" />}
            label="Files"
          />
          <PanelButton
            active={activePanel === 'diagram'}
            onClick={() => setActivePanel('diagram')}
            icon={<Layers className="w-4 h-4" />}
            label="Diagram"
          />
          <PanelButton
            active={activePanel === 'sandbox'}
            onClick={() => setActivePanel('sandbox')}
            icon={<Terminal className="w-4 h-4" />}
            label="Sandbox"
          />
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Side panel */}
        <motion.div
          className="w-80 border-r border-dv-border bg-dv-surface overflow-hidden"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
        >
          {activePanel === 'files' && (
            <FileExplorer
              files={mockFileTree}
              selectedFile={selectedFile}
              onSelectFile={setSelectedFile}
            />
          )}
          {activePanel === 'diagram' && (
            <DiagramPanel filePath={selectedFile} />
          )}
          {activePanel === 'sandbox' && (
            <SandboxPanel />
          )}
        </motion.div>

        {/* Walkthrough player */}
        <div className="flex-1 overflow-hidden">
          <WalkthroughPlayer
            code={mockCodeContent}
            script={mockWalkthroughScript}
            filePath={selectedFile}
            isPlaying={isPlaying}
            onPlayingChange={setIsPlaying}
          />
        </div>
      </div>
    </div>
  )
}

function PanelButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
        active
          ? 'bg-dv-accent/10 text-dv-accent'
          : 'text-dv-text-muted hover:bg-dv-elevated hover:text-dv-text'
      )}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </button>
  )
}

