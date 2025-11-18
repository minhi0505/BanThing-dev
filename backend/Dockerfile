# 1. Java 21 공식 이미지 사용
FROM eclipse-temurin:21-jdk-alpine

# 2. 작업 폴더 설정
WORKDIR /app

# 3. 프로젝트의 모든 파일을 컨테이너 안으로 복사
COPY . .

# 4. Gradle 실행 권한 부여 (윈도우/맥 호환성 위해 필수)
RUN chmod +x ./gradlew

# 5. 빌드 실행 (테스트 건너뛰고 빠르게 빌드)
RUN ./gradlew clean bootJar -x test

# 6. 실행 설정
# - Prod 프로필 활성화
# - 메모리 제한 설정 (256MB ~ 384MB)
# - 포트 설정 (Railway가 주는 PORT 사용)
ENV SPRING_PROFILES_ACTIVE=prod

CMD ["java", "-Xms256m", "-Xmx384m", "-jar", "-Dserver.port=${PORT}", "build/libs/banthing-0.0.1-SNAPSHOT.jar"]