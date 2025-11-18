import React, { useState, useEffect, useRef, useCallback } from 'react';
import { sendMessageToChatbot, getChatbotHistory, isUserAuthenticated } from '../../services/chatbotApi.js';
import styles from './ChatbotStyles.module.scss';
import { FaRobot } from "react-icons/fa6";
import { BsSendPlus } from "react-icons/bs";
import { IoMdClose } from "react-icons/io";
import { FaHourglassHalf } from "react-icons/fa";
import { MdWavingHand } from "react-icons/md";
import MeetingCard from './MeetingCard';

const ChatbotMain = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // 채팅 기록 로드 함수를 useCallback으로 메모이제이션
    const loadChatHistory = useCallback(async () => {
        try {
            const result = await getChatbotHistory();
            if (result.success) {
                const history = result.data.slice(-10);
                const formattedMessages = [];

                history.reverse().forEach(item => {
                    formattedMessages.push({
                        type: 'user',
                        content: item.userMessage,
                        timestamp: new Date(item.createdAt)
                    });
                    formattedMessages.push({
                        type: 'bot',
                        content: item.botResponse,
                        timestamp: new Date(item.createdAt)
                    });
                });

                setMessages(formattedMessages);

                // 기록 로드 후 스크롤 하단으로
                setTimeout(() => {
                    if (messagesEndRef.current) {
                        messagesEndRef.current.scrollIntoView({
                            behavior: 'auto', // 기록 로드는 즉시
                            block: 'end'
                        });
                    }
                }, 50);
            }
        } catch (error) {
            console.error('대화 기록 로드 실패:', error);
            console.log('로그인하지 않은 사용자 - 히스토리 없이 시작');
        }
    }, []);

    // 인증 상태 확인
    useEffect(() => {
        const checkAuthStatus = async () => {
            try {
                const authStatus = await isUserAuthenticated();
                setIsAuthenticated(authStatus);

                // 로그인한 사용자만 히스토리 로드
                if (authStatus) {
                    await loadChatHistory();
                }
            } catch (error) {
                console.error('인증 상태 확인 실패:', error);
                setIsAuthenticated(false);
            }
        };

        checkAuthStatus();
    }, [loadChatHistory]);

    // 스크롤 하단 고정
    useEffect(() => {
        const scrollToBottom = () => {
            if (messagesEndRef.current) {
                messagesEndRef.current.scrollIntoView({
                    behavior: 'smooth',
                    block: 'end'
                });
            }
        };

        // 새 메시지나 기록 로드 후 스크롤
        const timer = setTimeout(scrollToBottom, 100);
        return () => clearTimeout(timer);
    }, [messages]);

    // 챗봇 열릴 때도 스크롤 하단 고정
    useEffect(() => {
        if (isOpen && messagesEndRef.current) {
            const timer = setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'end'
                });
            }, 300); // 애니메이션 시간 후
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // 채팅창 오픈 시 포커스
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    // 메시지 전송 함수
    const sendMessage = useCallback(async () => {
        if (!inputMessage.trim() || isLoading) return;

        const userMessage = inputMessage.trim();
        setInputMessage('');
        setIsLoading(true);

        const newUserMessage = {
            type: 'user',
            content: userMessage,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, newUserMessage]);

        try {
            const result = await sendMessageToChatbot(userMessage);

            if (result.success) {
                const botMessage = {
                    type: 'bot',
                    content: result.data.response,
                    timestamp: new Date(),
                    // +++++ 추가: 모임 추천 정보 포함 +++++
                    suggestedMeetings: result.data.suggestedMeetings || [],
                    intentType: result.data.intentType
                };
                setMessages(prev => [...prev, botMessage]);
            } else {
                throw new Error(result.error || '응답 처리 중 오류가 발생했습니다.');
            }
        } catch (error) {
            console.error('메시지 전송 실패:', error);

            const errorMessage = {
                type: 'bot',
                content: isAuthenticated
                    ? '죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
                    : '현재 AI 서버에 연결할 수 없습니다. 로그인 후 이용하시면 더 정확한 답변을 받으실 수 있어요! 😊',
                timestamp: new Date(),
                isError: true
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    }, [inputMessage, isLoading, isAuthenticated]);

    // 키보드 이벤트 처리
    const handleKeyPress = useCallback((e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    }, [sendMessage]);

    // 메시지 포맷팅
    const formatMessage = useCallback((content) => {
        return content.split('\n').map((line, index) => (
            <React.Fragment key={index}>
                {line}
                {index < content.split('\n').length - 1 && <br />}
            </React.Fragment>
        ));
    }, []);

    // 회원가입 버튼 클릭 핸들러
    const handleSignupClick = useCallback(() => {
        // VITE_API_URL 환경 변수를 사용하도록 수정
        const KAKAO_AUTH_URL = `${import.meta.env.VITE_API_URL}/oauth2/authorization/kakao`;
        window.location.href = KAKAO_AUTH_URL;
    }, []);

    // 회원가입 관련 키워드 감지
    const shouldShowSignupButton = useCallback((message) => {
        const signupKeywords = [
            '회원가입', '가입', '로그인', '시작', '가입하기', '회원',
            '가입을', '가입해', '로그인을', '로그인해', '시작해',
            '카카오', '계정', '등록', '서비스', '이용', '참여'
        ];
        return signupKeywords.some(keyword => message.includes(keyword));
    }, []);

    // 챗봇 토글
    const toggleChatbot = useCallback(() => {
        setIsOpen(prevOpen => !prevOpen);
    }, []);

    // 모임 카드 클릭 핸들러 (로그인 사용자)
    const handleMeetingCardClick = useCallback((meetingId) => {
        window.location.href = `/meetings/${meetingId}`;
    }, []);

// 로그인 필요 핸들러 (비로그인 사용자)
    const handleLoginRequired = useCallback((meeting) => {
        const confirmMessage = `
${meeting.title} 모임의 자세한 정보를 보시려면 로그인이 필요합니다.
        
카카오톡으로 간편하게 로그인하시겠습니까?
    `.trim();

        if (window.confirm(confirmMessage)) {
            handleSignupClick();
        }
    }, [handleSignupClick]);


    return (
        <div className={styles.container}>
            <button
                className={`${styles.trigger} ${isOpen ? styles.active : ''}`}
                onClick={toggleChatbot}
                aria-label="AI 도우미"
                type="button"
            >
                <span className={styles.icon}>
                    {isOpen ? <IoMdClose /> : <FaRobot />}
                </span>
            </button>

            {isOpen && (
                <div className={styles.window}>
                    <div className={styles.header}>
                        <div className={styles.headerTitle}>
                            <span className={styles.headerIcon}>
                                <FaRobot />
                            </span>
                            <span>반띵 AI 도우미</span>
                        </div>
                        <button
                            className={styles.headerClose}
                            onClick={toggleChatbot}
                            aria-label="닫기"
                            type="button"
                        >
                            <IoMdClose />
                        </button>
                    </div>

                    <div className={styles.messages}>
                        {messages.length === 0 ? (
                            <div className={styles.welcome}>
                                <div className={styles.welcomeIcon}>
                                    <MdWavingHand />
                                </div>
                                <div className={styles.welcomeText}>
                                    안녕하세요! 반띵 AI 도우미입니다.<br />
                                    소분 모임 찾기, 이용 방법 등을<br />
                                    도와드릴 수 있어요!

                                    {!isAuthenticated && (
                                        <>
                                            <br /><br />
                                            <span style={{ fontSize: '12px', opacity: '0.7' }}>
                                                💡 로그인하시면 대화 기록이 저장되고<br />
                                                더 정확한 답변을 받으실 수 있어요!
                                            </span>
                                            <br />
                                            <button
                                                className={styles.signupButton}
                                                onClick={handleSignupClick}
                                                type="button"
                                            >
                                                카카오로 시작하기
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ) : (
                            messages.map((message, index) => (
                                <div
                                    key={index}
                                    className={`${styles.message} ${styles[message.type]} ${message.isError ? styles.error : ''}`}
                                >
                                    <div className={styles.messageContent}>
                                        {formatMessage(message.content)}

                                        {/* 추천 모임 카드들 렌더링 */}
                                        {message.suggestedMeetings && message.suggestedMeetings.length > 0 && (
                                            <div className={styles.meetingCards}>
                                                {message.suggestedMeetings.map((meeting, index) => (
                                                    <MeetingCard
                                                        key={`${meeting.meetingId}-${index}`}
                                                        meeting={meeting}
                                                        isAuthenticated={isAuthenticated}
                                                        onCardClick={handleMeetingCardClick}
                                                        onLoginRequired={handleLoginRequired}
                                                    />
                                                ))}
                                            </div>
                                        )}

                                        {/* 챗봇 메시지에서 회원가입 관련 키워드 감지 시 버튼 표시 */}
                                        {message.type === 'bot' && !isAuthenticated && shouldShowSignupButton(message.content) && (
                                            <div style={{ marginTop: '12px' }}>
                                                <button
                                                    className={styles.signupButton}
                                                    onClick={handleSignupClick}
                                                    type="button"
                                                >
                                                    카카오로 시작하기
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div className={styles.messageTime}>
                                        {message.timestamp.toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </div>
                                </div>
                            ))
                        )}

                        {isLoading && (
                            <div className={`${styles.message} ${styles.bot}`}>
                                <div className={styles.messageContent}>
                                    <div className={styles.typing}>
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    <div className={styles.input}>
                        <div className={styles.inputWrapper}>
                            <textarea
                                ref={inputRef}
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="메시지를 입력하세요..."
                                className={styles.inputField}
                                rows="1"
                                disabled={isLoading}
                            />
                            <button
                                onClick={sendMessage}
                                disabled={!inputMessage.trim() || isLoading}
                                className={styles.sendButton}
                                aria-label="전송"
                                type="button"
                            >
                                <span>
                                    {isLoading ? <FaHourglassHalf /> : <BsSendPlus />}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatbotMain;