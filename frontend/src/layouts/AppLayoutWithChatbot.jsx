import React from 'react';
import { useLocation } from 'react-router-dom';
import AppLayout from './AppLayout.jsx';
import ChatbotMain from '../components/ChatBot/ChatbotMain.jsx';
import '../App.scss'; // 공통 스타일 있으면 여기서 import

export default function AppLayoutWithChatbot() {
    const { pathname } = useLocation();
    // 로그인/약관 등에서 숨기고 싶으면 여기 추가
    const hideChatbot =
        pathname.startsWith('/login') || pathname.startsWith('/agreement');

    return (
        <>
            <AppLayout /> {/* AppHeader + <Outlet/> 포함 */}
            {!hideChatbot && (
                <div
                    style={{
                        position: 'fixed',
                        right: 24,
                        bottom: 24,
                        zIndex: 10000,
                        width: 380,
                        maxWidth: '90vw',
                        height: 560,
                        maxHeight: '80vh',
                        borderRadius: 16,
                        boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
                        background: '#fff',
                        overflow: 'hidden',
                    }}
                >
                    <ChatbotMain  />
                </div>
            )}
        </>
    );
}
