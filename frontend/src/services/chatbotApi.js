import axios from 'axios';

const API_BASE_URL = `${import.meta.env.VITE_API_URL}/api` || 'http://localhost:9000/api';

// 챗봇 메시지 전송
export const sendMessageToChatbot = async (message) => {
    try {
        const response = await axios.post(
            `${API_BASE_URL}/chatbot/message`,
            { message },
            {
                headers: {
                    'Content-Type': 'application/json',
                },
                withCredentials: true, // 쿠키 포함
            }
        );

        return {
            success: true,
            data: response.data.data
        };
    } catch (error) {
        console.error('챗봇 메시지 전송 실패:', error);

        // 인증 에러인 경우 게스트 API로 폴백
        if (error.response?.status === 401) {
            try {
                const guestResponse = await axios.post(
                    `${API_BASE_URL}/chatbot/guest`,
                    { message },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                        }
                    }
                );

                return {
                    success: true,
                    data: guestResponse.data.data
                };
            } catch (guestError) {
                console.error('게스트 챗봇 API 실패:', guestError);
                return {
                    success: false,
                    error: '챗봇 서비스에 일시적인 문제가 있습니다.'
                };
            }
        }

        return {
            success: false,
            error: error.response?.data?.message || '메시지 전송에 실패했습니다.'
        };
    }
};

// 챗봇 대화 기록 조회
export const getChatbotHistory = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/chatbot/history`, {
            withCredentials: true, // 쿠키 포함
        });

        return {
            success: true,
            data: response.data.data
        };
    } catch (error) {
        console.error('대화 기록 조회 실패:', error);
        return {
            success: false,
            error: error.response?.data?.message || '대화 기록을 불러올 수 없습니다.'
        };
    }
};

// 로그인 상태 확인 (개선된 버전)
export const isUserAuthenticated = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/users/me`, {
            withCredentials: true, // 쿠키 포함
            timeout: 5000, // 5초 타임아웃
        });

        // 성공적으로 사용자 정보를 받아왔다면 로그인 상태
        return response.status === 200 && response.data?.data;
    } catch (error) {
        // 401, 403 등 인증 관련 오류나 네트워크 오류 시 비로그인으로 처리
        console.log('인증 상태 확인:', error.response?.status || 'network error');
        return false;
    }
};

// 챗봇 서비스 상태 확인
export const checkChatbotHealth = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/chatbot/health`);
        return {
            success: true,
            isHealthy: response.data.data === 'HEALTHY'
        };
    } catch (error) {
        console.error('챗봇 헬스체크 실패:', error);
        return {
            success: false,
            isHealthy: false
        };
    }
};