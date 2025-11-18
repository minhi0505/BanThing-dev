// MeetingDetailPage.jsx
import React, {useState, useEffect} from 'react';
import {useParams, useNavigate} from 'react-router-dom';
import {useAuthStore} from '../stores/authStore';
import {
    getMeetingDetail,
    joinMeeting,
    leaveMeeting,
    getParticipants,
    deleteMeeting,
    getComments,
    postComment,
    updateComments,
    completeMeeting,
    // deleteComments
} from '../services/meetingDetailApi';
import {FaMapMarkerAlt, FaCalendarAlt, FaUsers, FaClock, FaEdit, FaTrash} from 'react-icons/fa';
import ChatbotMain from '../components/ChatBot/ChatbotMain.jsx';
import styles from './MeetingDetailPage.module.scss';
import {AuthService} from "../services/authService.js";
import CommentModal from "../components/Comment/CommentModal.jsx";
import CommentList from "../components/Comment/CommentList.jsx";
import CommentForm from "../components/Comment/CommentForm.jsx";
import ParticipantsTab from '../components/Meeting/ParticipantsTab';
import {approveParticipant, rejectParticipant} from '../services/participantApi';
import HostInfo from '../components/Meeting/HostInfo';
import FeedbackModal from "../components/Meeting/FeedbackModal";


const MeetingDetailPage = () => {
    const {id} = useParams(); // 미팅id
    const navigate = useNavigate();
    const {isAuthenticated, user} = useAuthStore(); // 로그인 여부

    const [meeting, setMeeting] = useState(null);
    const [participants, setParticipants] = useState({approved: [], pending: []});
    const [activeTab, setActiveTab] = useState('participants');
    const [isLoading, setIsLoading] = useState(true);
    const [isJoining, setIsJoining] = useState(false);
    const [error, setError] = useState(null);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [isSubmittingComment, setIsSubmittingComment] = useState(false); // 댓글 전송 상태
    const [isModalOpen, setIsModalOpen] = useState(false); // 모달 상태
    const [selectedComment, setSelectedComment] = useState(null); // 선택된 댓글 정보
    const [modalPosition, setModalPosition] = useState({x: 0, y: 0});
    // 댓글 수정
    const [isEditing, setIsEditing] = useState(false); // 수정 모드 여부
    const [editingCommentId, setEditingCommentId] = useState(null); // 수정할 댓글 ID
    const [editedCommentContent, setEditedCommentContent] = useState(''); // 수정할 댓글 내용 상태
    const [isCompletingMeeting, setIsCompletingMeeting] = useState(false);
    // 피드백 모달
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
    const [selectedFeedbackUser, setSelectedFeedbackUser] = useState(null);

    useEffect(() => {
        // meeting state가 성공적으로 로드되거나 변경될 때마다 실행됩니다.
        if (meeting) {
            console.log('meeting 객체가 업데이트되었습니다:', meeting);
            console.log('그 안의 hostInfo 객체:', meeting.hostInfo);
        }
    }, [meeting]);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        fetchMeetingDetail();
        fetchParticipants();
        fetchComments();
    }, [id, isAuthenticated, navigate]);


    // 댓글 목록 불러오기 함수-송민재
    const fetchComments = async () => {
        // console.log("user", user);

        try {
            const result = await getComments(id); // API 호출 함수 (새로 구현 필요)
            if (result.success) {
                setComments(result.data.reverse());
            } else {
                // 수정됨: 댓글 로드 실패 시 전체 페이지 에러로 전환하지 않음
                // setError(result.message || '댓글 정보를 불러올 수 없습니다.')

                // 대신 콘솔에 경고만 남기고 넘어갑니다.
                console.warn('댓글을 불러오지 못했습니다 (무시함):', result.message);
            }
        } catch (error) {
            // 네트워크 오류 등이 발생해도 페이지는 계속 보여줍니다.
            console.error('댓글을 불러오는 데 실패했습니다.', error);
        }
    };

    const fetchMeetingDetail = async () => {
        try {
            const result = await getMeetingDetail(id);
            if (result.success) {
                setMeeting(result.data);
            } else {
                setError(result.message || '모임 정보를 불러올 수 없습니다.');
            }
        } catch (error) {
            console.error('모임 상세 조회 실패:', error);
            setError('모임 정보를 불러오는 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchParticipants = async () => {
        try {
            const result = await getParticipants(id);
            if (result.success) {
                setParticipants(result.data);
            }
        } catch (error) {
            console.error('참여자 목록 조회 실패:', error);
        }
    };

    /**
     * 모임 참여 신청 처리 함수
     *
     * @author 김경민
     * @since 2025.09.21
     * 변경 이유:
     * 1. 기존 문제: 서버 응답을 기다린 후 fetchParticipants() 호출로 인해
     * 사용자가 참여 신청 후에도 버튼이 즉시 "신청 대기중"으로 바뀌지 않았음
     * 2. 해결 방법: Optimistic UI 패턴 적용
     * - 서버 요청 전에 먼저 로컬 상태를 업데이트하여 즉시 UI 반영
     * - 요청 실패 시 상태를 원래대로 롤백하여 데이터 일관성 유지
     * 3. 사용자 경험 개선: 버튼 클릭 즉시 시각적 피드백 제공
     */
    const handleJoinMeeting = async () => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        setIsJoining(true);
        try {
            // 서버 응답을 기다리지 않고 먼저 로컬 상태를 업데이트
            // 이를 통해 사용자에게 즉시 시각적 피드백 제공 (참여신청하기 → 신청 대기중)
            setParticipants(prev => ({
                ...prev,
                pending: [...prev.pending, {
                    participantId: Date.now(),
                    nickname: user?.nickname,
                    userId: user?.userId,
                    profileImageUrl: user?.profileImageUrl,
                    trustScore: user?.trustScore || 0,
                    applicationStatus: 'PENDING'
                }]
            }));

            // === 서버 요청 실행 ===
            const result = await joinMeeting(id);
            if (result.success) {
                alert('모임 참여 신청이 완료되었습니다!');
            } else {
                // === 실패 시 롤백 ===
                // 서버에서 실패 응답이 온 경우 로컬 상태를 원래대로 복원
                setParticipants(prev => ({
                    ...prev,
                    pending: prev.pending.filter(p => p.nickname !== user?.nickname)
                }));
                alert(result.message || '참여 신청에 실패했습니다.');
            }
        } catch (error) {
            // === 네트워크 오류 시 롤백 ===
            // 네트워크 오류나 예외 발생 시에도 로컬 상태 복원
            setParticipants(prev => ({
                ...prev,
                pending: prev.pending.filter(p => p.nickname !== user?.nickname)
            }));
            console.error('모임 참여 실패:', error);
            alert('참여 신청 중 오류가 발생했습니다.');
        } finally {
            setIsJoining(false);    // 로딩 상태 해제
        }
    };

    const handleLeaveMeeting = async () => {
        if (!confirm('정말 모임에서 탈퇴하시겠습니까?')) return;

        try {
            const result = await leaveMeeting(id);
            if (result.success) {
                await fetchMeetingDetail();
                await fetchParticipants();
                alert('모임에서 탈퇴했습니다.');
            } else {
                alert(result.message || '탈퇴에 실패했습니다.');
            }
        } catch (error) {
            console.error('모임 탈퇴 실패:', error);
            alert('탈퇴 중 오류가 발생했습니다.');
        }
    };

    /**
     * 모임 완료 처리 함수
     * 호스트만 실행 가능하며, 진행중(ONGOING) 상태에서만 호출됨
     * 완료 처리 후 모임 상태가 COMPLETED로 변경됨
     * @author 김경민
     * @since 2025.09.21
     */
    const handleCompleteMeeting = async () => {
        if (!confirm('정말 모임을 완료하시겠습니까? 완료된 모임은 되돌릴 수 없습니다.')) return;

        setIsCompletingMeeting(true);
        try {
            const result = await completeMeeting(id);
            if (result.success) {
                await fetchMeetingDetail();
                alert('모임이 완료되었습니다.');
            } else {
                alert(result.message || '모임 완료 처리에 실패했습니다.');
            }
        } catch (error) {
            console.error('모임 완료 처리 실패:', error);
            alert('모임 완료 처리 중 오류가 발생했습니다.');
        } finally {
            setIsCompletingMeeting(false);
        }
    };

    // 모달의 수정 버튼을 눌렀을 때 실행될 함수
    // 이 함수가 부모 컴포넌트의 상태를 변경하여 수정 폼을 활성화
    const startEditing = (comment) => {
        // 폼의 textarea에 기존 댓글 내용 채우기
        setEditedCommentContent(comment.content);
        setIsEditing(true); // 수정 모드 시작
        setEditingCommentId(comment.commentId); // 수정할 댓글 ID 저장
        setIsModalOpen(false); // 모달 닫기
    };

    // 수정 모드 취소 핸들러
    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditingCommentId(null);
        setEditedCommentContent(''); // textarea 비우기
    };

    /**
     * 댓글 작성 핸들러
     * @param {Event} e - 폼 제출 이벤트 객체
     * @returns {Promise<void>}
     */
    const handleCommentSubmit = async (e) => {
        e.preventDefault(); // 기본 폼 제출 동작 방지

        if (isEditing && !editedCommentContent.trim()) {
            alert("수정할 내용을 입력해주세요.");
            return;
        } else if (!isEditing && !newComment.trim()) {
            alert("댓글 내용을 입력해주세요.");
            return;
        }

        // 2. 댓글 전송 중 상태로 변경하여 중복 제출 방지
        setIsSubmittingComment(true);

        try {
            if (isEditing) {
                // 수정 로직: 백엔드 API 경로와 요청 바디에 맞게 수정
                await updateComments(id, editingCommentId, {content: editedCommentContent});
                alert("댓글이 수정되었습니다.");
                handleCancelEdit(); // 수정 모드 종료 및 폼 초기화
            } else {
                // 댓글 작성 로직
                const result = await postComment(id, {content: newComment});
                if (result.success) {
                    setNewComment('');
                } else {
                    alert(result.message || "댓글 작성에 실패했습니다.");
                }
            }
            fetchComments(); // 작성 또는 수정 후 댓글 목록 갱신
        } catch (error) {
            console.error("댓글 작성/수정 실패:", error.response ? error.response.data : error.message);
            alert("댓글 작성/수정 중 오류가 발생했습니다.");
        } finally {
            setIsSubmittingComment(false);
        }
    };

    // ✨✨✨ 삭제 핸들러
    /*const handleCommentDelete = async (commentId) => {
        const isConfirmed = window.confirm('정말로 댓글을 삭제하시겠습니까?');
        if (!isConfirmed) return;

        try {
            const res = await deleteComment(commentId);
            if (res.success) {
                alert('댓글이 삭제되었습니다.');
                setComments(comments.filter(c => c.commentId !== commentId));
            } else {
                alert(res.message);
            }
        } catch (err) {
            console.error('댓글 삭제 오류:', err);
            alert('댓글 삭제 중 오류가 발생했습니다.');
        }
    };*/


    // 삭제 핸들러 추가
    const handleDeleteMeeting = async () => {
        if (!confirm('정말 모임을 삭제하시겠습니까? 삭제된 모임은 복구할 수 없습니다.')) return;

        try {
            const result = await deleteMeeting(id);
            if (result.success) {
                alert('모임이 삭제되었습니다.');
                // 메인 페이지로 리다이렉트
                navigate('/', {replace: true});
            } else {
                alert(result.message || '모임 삭제에 실패했습니다.');
            }
        } catch (error) {
            console.error('모임 삭제 실패:', error);
            alert('모임 삭제 중 오류가 발생했습니다.');
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    };

    const getStatusColor = (status) => {
        const statusColors = {
            'RECRUITING': styles.recruiting,
            'FULL': styles.full,
            'ONGOING': styles.ongoing,
            'COMPLETED': styles.completed,
            'CANCELLED': styles.cancelled
        };
        return statusColors[status] || '';
    };

    const getStatusText = (status) => {
        const statusTexts = {
            'RECRUITING': '모집중',
            'FULL': '모집완료',
            'ONGOING': '진행중',
            'COMPLETED': '모임종료',
            'CANCELLED': '모임취소'
        };
        return statusTexts[status] || status;
    };

    /* const getTrustBadgeClass = (score) => {
          if (score >= 500) return styles.trustGood;
          if (score <= 100) return styles.trustWarning;
          return styles.trustBasic;
      };*/

    /**
     * 현재 로그인한 사용자가 모임의 호스트인지 확인하는 함수
     * @returns {boolean} 호스트 여부
     */
    const isHost = () => {
        return meeting?.hostInfo?.nickname === user?.nickname;
    };

    const isParticipating = () => {
        return participants.approved.some(p => p.nickname === user?.nickname) ||
            participants.pending.some(p => p.nickname === user?.nickname);
    };

    const getParticipationStatus = () => {
        if (participants.approved.some(p => p.nickname === user?.nickname)) {
            return 'approved';
        }
        if (participants.pending.some(p => p.nickname === user?.nickname)) {
            return 'pending';
        }
        return 'none';
    };

    const participationStatus = getParticipationStatus();


    /**
     * 참가자의 모임 참여 신청을 승인하는 함수
     * 승인 시 참가자를 대기 목록에서 제거하고 승인된 목록으로 이동
     * @param participant 승인할 참가자 정보
     * @author 고동현
     * @since 2025.09.19
     */
    const handleApprove = async (participant) => {
        if (!window.confirm(`${participant.nickname}님의 참여를 승인하시겠습니까?`)) return;
        try {
            const result = await approveParticipant(id, participant.participantId);
            if (result.success) {
                alert('참여를 승인했습니다.');

                // 서버에 다시 요청하는 대신, 현재 상태(state)를 직접 업데이트합니다.
                setParticipants(currentParticipants => {
                    // 1. 방금 승인된 사용자를 '대기중' 목록에서 제거합니다.
                    const newPending = currentParticipants.pending.filter(
                        p => p.participantId !== participant.participantId
                    );

                    // 2. '확정' 목록에 방금 승인된 사용자를 추가합니다.
                    const newApproved = [...currentParticipants.approved, participant];

                    // 3. 새로 만든 두 목록으로 상태를 업데이트하여 리렌더링을 발생시킵니다.
                    return {...currentParticipants, approved: newApproved, pending: newPending};
                });

            } else {
                alert(result.message || '승인 처리에 실패했습니다.');
            }
        } catch (err) {
            console.error('참여 승인 실패:', err);
            alert('승인 처리 중 오류가 발생했습니다.');
        }
    };

    /**
     * 참가자의 모임 참여 신청을 거절하는 함수
     * 거절 시 참가자를 대기 목록에서 제거
     * @param participant 거절할 참가자 정보
     * @author 고동현
     * @since 2025.09.19
     */
    const handleReject = async (participant) => {
        if (!window.confirm(`${participant.nickname}님의 참여를 거절하시겠습니까?`)) return;
        try {
            const result = await rejectParticipant(id, participant.participantId);
            if (result.success) {
                alert('참여를 거절했습니다.');


                // 거절의 경우, '대기중' 목록에서 제거하기만 하면 됩니다.
                setParticipants(currentParticipants => {
                    const newPending = currentParticipants.pending.filter(
                        p => p.participantId !== participant.participantId
                    );
                    return {...currentParticipants, pending: newPending};
                });


            } else {
                alert(result.message || '거절 처리에 실패했습니다.');
            }
        } catch (err) {
            console.error('참여 거절 실패:', err);
            alert('거절 처리 중 오류가 발생했습니다.');
        }
    };


    if (error) {
        return (
            <div className={styles.container}>
                <div className={styles.error}>
                    <h2>오류가 발생했습니다</h2>
                    <p>{error}</p>
                    <button onClick={() => navigate('/')} className={styles.backButton}>
                        목록으로 돌아가기
                    </button>
                </div>
                <ChatbotMain/>
            </div>
        );
    }

    if (!meeting) {
        return (
            <div className={styles.container}>
                <div className={styles.notFound}>
                    <h2>모임을 찾을 수 없습니다</h2>
                    <button onClick={() => navigate('/')} className={styles.backButton}>
                        목록으로 돌아가기
                    </button>
                </div>
                <Chatbot/>
            </div>
        );
    }


    // 댓글 삭제 함수
    /*const handleCommentDelete = async (commentId) => {
        if (!isLoggedIn) {
            alert("댓글을 삭제하려면 로그인이 필요합니다.");
            return;
        }

        if (!isParticipant) {
            alert("댓글을 삭제하려면 모임에 참여해야 합니다.");
            return;
        }

        if (window.confirm('정말 이 댓글을 삭제하시겠습니까?')) {
            try {
                // apiClient 사용
                await apiClient.delete(
                    `/meetings/${meetingId}/comments/${commentId}`
                );
                fetchComments();
            } catch (error) {
                console.error('댓글 삭제 실패:', error);
                alert("댓글 삭제에 실패했습니다.");
            }
        }
    };*/

    // 모달을 여는 함수
    const handleOpenModal = (comment, e) => {
        // console.log("선택된 댓글:", comment);
        const rect = e.target.getBoundingClientRect(); // 버튼의 위치와 크기 정보를 가져옴
        setModalPosition({
            x: rect.left,
            y: rect.top,
        });
        setSelectedComment(comment);
        setIsModalOpen(true);
        // console.log("isModalOpen 상태 변경:", isModalOpen); // 이 로그는 변경 전 값을 표시할 수 있음
    };

    // 모달을 닫는 함수
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedComment(null);
    };

    // 모달을 열고 피드백 대상 유저 정보를 설정하는 함수
    const openFeedbackModal = (userId, nickname) => {
        setSelectedFeedbackUser({ userId, nickname });
        setIsFeedbackModalOpen(true);
    };

    return (
        <div className={styles.container}>
            <div className={styles.detailCard}>
                {/* 모임 기본 정보 */}
                <div className={styles.meetingHeader}>
                    <div className={styles.headerTop}>
                        <h1 className={styles.title}>{meeting.title}</h1>
                        <span className={`${styles.statusBadge} ${getStatusColor(meeting.status)}`}>
                            {getStatusText(meeting.status)}
                        </span>
                    </div>

                    <div className={styles.meetingMeta}>
                        <div className={styles.metaItem}>
                            <FaMapMarkerAlt/>
                            <span>{meeting.martName}</span>
                        </div>
                        <div className={styles.metaItem}>
                            <FaCalendarAlt/>
                            <span>{formatDate(meeting.meetingDate)}</span>
                        </div>
                        <div className={styles.metaItem}>
                            <FaUsers/>
                            <span>{participants.approved.length} / {meeting.maxParticipants}명</span>
                        </div>
                    </div>

                    {/* 호스트 정보 */}
                    <HostInfo
                        host={meeting.hostInfo}
                        isHost={isHost()}
                        onDeleteMeeting={handleDeleteMeeting}
                    />
                </div>

                {/* 모임 상세 내용 */}
                <div className={styles.meetingContent}>
                    <h3>모임 상세 정보</h3>
                    <div className={styles.description}>
                        {meeting.description.split('\n').map((line, index) => (
                            <p key={index}>{line}</p>
                        ))}
                    </div>
                </div>

                {/* 탭 메뉴 */}
                <div className={styles.tabMenu}>
                    <button
                        className={`${styles.tabButton} ${activeTab === 'participants' ? styles.active : ''}`}
                        onClick={() => setActiveTab('participants')}
                    >
                        참여자 목록 ({participants.approved.length}/{meeting.maxParticipants})
                    </button>
                    <button
                        className={`${styles.tabButton} ${activeTab === 'comments' ? styles.active : ''}`}
                        onClick={() => setActiveTab('comments')}
                    >
                        댓글 ({comments.length})
                    </button>
                </div>

                {/* 탭 콘텐츠 */}
                <div className={styles.tabContent}>
                    {/* {activeTab === 'participants' && (
                        <div className={styles.participantsTab}>
                            <h4>확정된 참여자</h4>
                            <div className={styles.participantsList}>
                                {participants.approved.map((participant, index) => (
                                    <div key={index} className={styles.participantItem}>
                                        <div className={styles.participantAvatar}>
                                            {participant.profileImageUrl ? (
                                                <img src={participant.profileImageUrl} alt={participant.nickname} />
                                            ) : (
                                                <div className={styles.defaultAvatar}>
                                                    {participant.nickname.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                        <div className={styles.participantInfo}>
                                            <div className={styles.participantName}>
                                                <span>{participant.nickname}</span>
                                                {participant.participantType === 'HOST' && (
                                                    <span className={styles.hostLabel}>호스트</span>
                                                )}
                                            </div>
                                            <div className={styles.participantStats}>
                                                신뢰도: {participant.TrusterScore}점
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {isHost() && participants.pending.length > 0 && (
                                <>
                                    <h4>신청 대기자</h4>
                                    <div className={styles.participantsList}>
                                        {participants.pending.map((participant, index) => (
                                            <div key={index} className={styles.participantItem}>
                                                <div className={styles.participantAvatar}>
                                                    {participant.profileImageUrl ? (
                                                        <img src={participant.profileImageUrl} alt={participant.nickname} />
                                                    ) : (
                                                        <div className={styles.defaultAvatar}>
                                                            {participant.nickname.charAt(0)}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className={styles.participantInfo}>
                                                    <div className={styles.participantName}>
                                                        <span>{participant.nickname}</span>
                                                        <span className={styles.pendingLabel}>대기중</span>
                                                    </div>
                                                    <div className={styles.participantStats}>
                                                        신뢰도: {participant.TrusterScore}점
                                                    </div>
                                                </div>
                                                <div className={styles.participantActions}>
                                                    <button className={styles.approveButton}>승인</button>
                                                    <button className={styles.rejectButton}>거절</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}*/}

                    {/* 탭 콘텐츠 */}
                    {activeTab === 'participants' && (() => {

                        // 1. meeting 데이터나 hostInfo가 아직 로드되지 않았을 경우를 대비
                        if (!meeting || !meeting.hostInfo) {
                            return null;
                        }

                        // 2. 호스트 정보를 참여자 객체와 동일한 형태
                        const hostAsParticipant = {
                            ...meeting.hostInfo,
                            // hostInfo에는 userId가 없으므로, 고유값인 nickname을 key로 사용하도록 전달합니다.
                            userId: meeting.hostInfo.nickname,
                            participantType: 'HOST',
                            trustScore: meeting.hostInfo.trustScore
                        };

                        // 3. 기존 확정 목록에서 혹시라도 중복될 수 있는 호스트를 제거하고,
                        //    새로 만든 호스트 객체를 배열의 맨 앞에 추가
                        const approvedWithHost = [
                            hostAsParticipant,
                            ...participants.approved.filter(p => p.nickname !== meeting.hostInfo.nickname)
                        ];

                        // 4. 모임 상태가 '진행 중' 또는 '완료'가 아닐 때만 참여자 관리가 가능합니다.
                        const canManageParticipants = meeting.status !== 'ONGOING' && meeting.status !== 'COMPLETED';


                        // 5. 새로 조합한 확정 참여자 목록과 관리 가능 여부를 props로 전달
                        return (
                            <ParticipantsTab
                                participants={{
                                    ...participants,
                                    approved: approvedWithHost
                                }}
                                isHost={isHost()}
                                onApprove={canManageParticipants ? handleApprove : undefined}
                                onReject={canManageParticipants ? handleReject : undefined}
                                styles={styles}
                                // FeedbackModal 관련 props 추가
                                meetingStatus={meeting.status}
                                myUserId={user.userId} // 현재 로그인한 유저의 ID 전달
                                myUserNickName={user.nickname}
                                openFeedbackModal={openFeedbackModal} // 수정된 모달 열기 함수 전달

                            />
                        );
                    })()}


                    {activeTab === 'comments' && (
                        <div className={styles.commentsTab}>
                            <CommentList
                                comments={comments}
                                user={user}
                                handleOpenModal={handleOpenModal}
                            />

                            {(isHost() || isParticipating()) && (
                                <CommentForm
                                    newComment={newComment} // 작성 로직을 위한 상태
                                    setNewComment={setNewComment} // 작성 로직을 위한 핸들러
                                    handleCommentSubmit={handleCommentSubmit}
                                    isSubmittingComment={isSubmittingComment}
                                    isEditing={isEditing}
                                    editedCommentContent={editedCommentContent} // 수정된 내용 상태 전달
                                    setEditedCommentContent={setEditedCommentContent} // 수정된 내용 핸들러 전달
                                    onCancelEdit={handleCancelEdit}
                                />
                            )}
                        </div>
                    )}
                </div>

                <div className={styles.actionButtons}>
                    {!isHost() && participationStatus === 'none' && meeting.status === 'RECRUITING' && (
                        <button
                            onClick={handleJoinMeeting}
                            disabled={isJoining}
                            className={styles.joinButton}
                        >
                            {isJoining ? '참여 신청 중...' : '참여 신청하기'}
                        </button>
                    )}

                    {!isHost() && participationStatus === 'pending' && (
                        <button
                            disabled
                            className={styles.pendingButton}
                        >
                            신청 대기중
                        </button>
                    )}

                    {!isHost() && participationStatus === 'approved' && (
                        <button
                            onClick={handleLeaveMeeting}
                            className={styles.leaveButton}
                        >
                            모임 탈퇴하기
                        </button>
                    )}

                    {isHost() && (meeting.status === 'ONGOING') && (
                        <button
                            onClick={handleCompleteMeeting}
                            disabled={isCompletingMeeting}
                            className={styles.completeButton}
                        >
                            {isCompletingMeeting ? '완료 처리 중...' : '모임 완료'}
                        </button>
                    )}

                    <button
                        onClick={() => navigate('/')}
                        className={styles.backButton}
                    >
                        목록으로
                    </button>
                </div>
            </div>

            <ChatbotMain/>
            {isModalOpen && (
                <CommentModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    comment={selectedComment} // 선택된 댓글 정보 그대로 전달
                    modalPosition={modalPosition}
                    onUpdate={startEditing} // `startEditing` 함수를 props로 전달
                    // onDelete={handleCommentDelete} // 삭제 핸들러 전달
                />
            )}

            {isFeedbackModalOpen && (
                <FeedbackModal
                    isOpen={isFeedbackModalOpen}
                    onClose={() => setIsFeedbackModalOpen(false)}
                    targetUser={selectedFeedbackUser}  // 이 prop이 중요합니다!
                    meetingId={id}
                />
            )}
        </div>
    );
};

export default MeetingDetailPage;

