import React, { useState, useEffect, useMemo, useCallback } from 'react';
import KakaoMap from "../components/Meeting/KakaoMap.jsx";
import MeetingList from "../components/Meeting/MeetingList.jsx";
import { searchMeetings } from '../services/meetingApi.js';
import styles from './MeetingListPage.module.scss';
import ChatbotMain from '../components/ChatBot/ChatbotMain.jsx';
import { FaSearch, FaPlus } from 'react-icons/fa';
import Pagination from '../components/Meeting/Pagination.jsx';
import { Link } from 'react-router-dom';

const MeetingListPage = () => {

    const [meetings, setMeetings] = useState([]);
    const [selectedMartId, setSelectedMartId] = useState(null);
    const [selectedMartName, setSelectedMartName] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const meetingsPerPage = 5;
    const [skeletonCount, setSkeletonCount] = useState(meetingsPerPage);

    useEffect(() => {
        setIsLoading(true);
        const fetchAllMeetings = async () => {
            try {
                const result = await searchMeetings('');
                if (result.success) {
                    const newMeetings = result.data;
                    setMeetings(newMeetings);
                    setSkeletonCount(Math.min(newMeetings.length, meetingsPerPage));
                } else {
                    setMeetings([]);
                    setSkeletonCount(1);
                }
            } catch (error) {
                console.error("모임 목록을 불러오는 중 에러 발생:", error);
                setMeetings([]);
                setSkeletonCount(1);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAllMeetings();
    }, []);

    const handleSearchChange = (e) => {
        setIsLoading(true);
        setSearchTerm(e.target.value);
        setCurrentPage(1);
        setTimeout(() => setIsLoading(false), 300);
    };

    const handleMarkerClick = useCallback((martId) => {
        setIsLoading(true);
        const newSelectedMartId = selectedMartId === martId ? null : martId;

        if (newSelectedMartId) {
            const mart = meetings.find(m => m.martId === newSelectedMartId);
            setSelectedMartName(mart ? mart.martName : null);
        } else {
            setSelectedMartName(null);
        }

        setSelectedMartId(newSelectedMartId);
        setCurrentPage(1);
        setTimeout(() => setIsLoading(false), 300);
    }, [meetings, selectedMartId]);

    const handleClearSelectedMart = useCallback(() => {
        setIsLoading(true);
        setSelectedMartId(null);
        setSelectedMartName(null);
        setSearchTerm('');
        setCurrentPage(1);
        setTimeout(() => setIsLoading(false), 300);
    }, []);

    const filteredMeetings = useMemo(() => {
        let tempMeetings = meetings;

        if (selectedMartId) {
            tempMeetings = tempMeetings.filter(meeting => meeting.martId === selectedMartId);
        }

        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            tempMeetings = tempMeetings.filter(meeting =>
                (meeting.title && meeting.title.toLowerCase().includes(lowercasedTerm)) ||
                (meeting.description && meeting.description.toLowerCase().includes(lowercasedTerm)) ||
                (meeting.martName && meeting.martName.toLowerCase().includes(lowercasedTerm))
            );
        }

        return tempMeetings;
    }, [meetings, selectedMartId, searchTerm]);

    const { currentMeetings, totalPages } = useMemo(() => {
        const indexOfLastMeeting = currentPage * meetingsPerPage;
        const indexOfFirstMeeting = indexOfLastMeeting - meetingsPerPage;
        const currentMeetingsSlice = filteredMeetings.slice(indexOfFirstMeeting, indexOfLastMeeting);
        const totalPages = Math.ceil(filteredMeetings.length / meetingsPerPage);
        return { currentMeetings: currentMeetingsSlice, totalPages };
    }, [currentPage, filteredMeetings, meetingsPerPage]);

    const paginate = (pageNumber) => {
        setIsLoading(true);
        setCurrentPage(pageNumber);
        setTimeout(() => setIsLoading(false), 300);
    };

    useEffect(() => {
        if (isLoading) {
            const count = filteredMeetings.slice((currentPage - 1) * meetingsPerPage, currentPage * meetingsPerPage).length;
            setSkeletonCount(Math.max(1, count > 0 ? count : (searchTerm || selectedMartId) ? 1 : meetingsPerPage));
        }
    }, [isLoading, currentPage, filteredMeetings, searchTerm, selectedMartId]);

    return (
        <div className={styles.container}>
            <div className={styles.actionBar}>
                <div className={styles.searchBar}>
                    <FaSearch className={styles.searchIcon} />
                    <input
                        type="text"
                        placeholder="어떤 모임을 찾으시나요?"
                        value={searchTerm}
                        onChange={handleSearchChange}
                    />
                </div>
                <Link to="/meetings/new" className={styles.createButton}>
                    <FaPlus /> 모임 생성
                </Link>
            </div>

            <KakaoMap
                meetings={meetings}
                onMarkerClick={handleMarkerClick}
                selectedMartName={selectedMartName}
                onClearSelectedMart={handleClearSelectedMart}
            />

            <MeetingList
                meetings={currentMeetings}
                isLoading={isLoading}
                skeletonCount={skeletonCount}
            />
            {totalPages > 1 && !isLoading && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    paginate={paginate}
                />
            )}
            <ChatbotMain  />
        </div>
    );
};

export default MeetingListPage;