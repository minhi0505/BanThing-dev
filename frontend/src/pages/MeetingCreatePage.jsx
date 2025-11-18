import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllMarts } from '../services/MartApi';
import { createMeeting } from '../services/createMeetingApi';
import styles from './MeetingCreatePage.module.scss';
import { IoIosWarning } from "react-icons/io";

const MeetingCreatePage = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        martId: '',
        title: '',
        description: '',
        meetingDate: '',
    });
    const [imageFile, setImageFile] = useState(null);
    const [marts, setMarts] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const getMinDateTime = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };
    const minDateTime = getMinDateTime();

    useEffect(() => {
        const fetchMarts = async () => {
            const result = await getAllMarts();
            if (result.success) {
                setMarts(result.data);
            } else {
                setErrors({ general: '마트 목록을 불러오는 데 실패했습니다.' });
            }
        };
        fetchMarts();
    }, []);

    // 실시간 검증을 위해 handleChange 함수를 강화합니다.
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        const newErrors = { ...errors };

        // 현재 필드의 기존 에러는 일단 지웁니다.
        if (newErrors[name]) {
            delete newErrors[name];
        }

        // '모임 시간' 필드가 변경될 때 실시간으로 유효성을 검사합니다.
        if (name === 'meetingDate') {
            if (value) {
                const selectedDate = new Date(value);
                const now = new Date();
                now.setSeconds(0);
                now.setMilliseconds(0);

                if (selectedDate < now) {
                    newErrors.meetingDate = '모임 시간은 현재 시간 이후로 설정해야 합니다.';
                }
            } else {
                newErrors.meetingDate = '모임 시간을 입력해야 합니다.';
            }
        }

        setErrors(newErrors);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
        }
    };

    // 최종 제출 시 한 번 더 전체적으로 검사합니다.
    const validateForm = () => {
        const newErrors = { ...errors }; // 기존 에러를 유지
        if (!formData.title.trim()) newErrors.title = '모임 제목은 필수 항목입니다.';
        if (!formData.martId) newErrors.martId = '모임 장소를 선택해야 합니다.';
        if (!formData.description.trim()) newErrors.description = '본문 내용은 필수 항목입니다.';

        // 시간 필드는 handleChange에서 이미 검증되었지만, 비어있는 경우를 위해 한번 더 체크
        if (!formData.meetingDate) {
            newErrors.meetingDate = '모임 시간을 입력해야 합니다.';
        }

        return newErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const formErrors = validateForm();
        if (Object.keys(formErrors).length > 0) {
            setErrors(formErrors);
            return;
        }

        setIsLoading(true);
        setErrors({});

        const result = await createMeeting(formData, imageFile);
        setIsLoading(false);

        if (result.success) {
            alert('모임이 성공적으로 생성되었습니다!');
            navigate(`/meetings/${result.data.meetingId}`);
        } else {
            setErrors({ general: result.message || '모임 생성 중 오류가 발생했습니다.' });
        }
    };

    const errorMessages = Object.values(errors);

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <h1 className={styles.title}>새로운 모임 만들기</h1>
                <p className={styles.subtitle}>
                    함께 장보고 나눌 새로운 모임을 만들어보세요!
                </p>

                <form onSubmit={handleSubmit} className={styles.form} noValidate>
                    {/* ... 다른 input 필드들은 동일 ... */}
                    <div className={styles.formGroup}>
                        <label htmlFor="title" className={styles.formLabel}>모임 제목</label>
                        <input type="text" id="title" name="title" className={`${styles.formInput} ${errors.title ? styles.inputError : ''}`} placeholder="예: 코스트코 베이글 소분해요" value={formData.title} onChange={handleChange} />
                    </div>
                    <div className={styles.formRow}>
                        <div className={`${styles.formGroup} ${styles.formGroupHalf}`}>
                            <label htmlFor="martId" className={styles.formLabel}>모임 장소</label>
                            <select id="martId" name="martId" className={`${styles.formSelect} ${errors.martId ? styles.inputError : ''}`} value={formData.martId} onChange={handleChange}>
                                <option value="">마트를 선택하세요</option>
                                {marts.map(mart => (<option key={mart.martId} value={mart.martId}>{mart.martName}</option>))}
                            </select>
                        </div>
                        <div className={`${styles.formGroup} ${styles.formGroupHalf}`}>
                            <label htmlFor="meetingDate" className={styles.formLabel}>모임 시간</label>
                            <input
                                type="datetime-local"
                                id="meetingDate"
                                name="meetingDate"
                                className={`${styles.formInput} ${errors.meetingDate ? styles.inputError : ''}`}
                                value={formData.meetingDate}
                                onChange={handleChange}
                                min={minDateTime}
                            />
                        </div>
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="description" className={styles.formLabel}>본문 내용</label>
                        <textarea id="description" name="description" className={`${styles.formTextarea} ${errors.description ? styles.inputError : ''}`} placeholder="모임에 대한 자세한 내용을 적어주세요. (예: 구매할 물품, 소분 방식, 만날 장소 등)" rows="8" value={formData.description} onChange={handleChange} />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="imageFile" className={styles.formLabel}>
                            썸네일 이미지 (선택)
                        </label>
                        <input
                            type="file"
                            id="imageFile"
                            name="imageFile"
                            className={styles.formInput}
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                    </div>

                    {errorMessages.length > 0 && (
                        <div className={styles.errorBox}>
                            <div className={styles.errorBoxIcon}>
                                <IoIosWarning />
                            </div>
                            <ul>
                                {errorMessages.map((msg, index) => (
                                    <li key={index}>{msg}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className={styles.buttonContainer}>
                        <button type="submit" className={styles.submitButton} disabled={isLoading}>
                            {isLoading ? '생성 중...' : '생성하기'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default MeetingCreatePage;