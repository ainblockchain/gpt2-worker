<h1 align="center">AIN Connect Worker 도커 버전</h1>
<h4 align="center">AIN Connect 와 연결하여 HW 생태계를 만들어주는 프로젝트이다.</h4>
                                                                                                
**AIN Worker** 프로젝트는 Node.js로 작성되었습니다.

<br>

## 🛠사전 설치

- ESLint 가 지원되는 에디터 (IntelliJ, VSCode 등)
- Node.js 12.16+
- Yarn 1.22+ (`npm install -g yarn`)

<br>

## 도커 빌드 및 업로드
```
./imagePath.sh
```

## 준비
```
{
  "ETH_ADDRESS": "", // 출금하기 위한 이더리움 주소 (ex. 0x~)
  "MODEL_NAME": "", // 추론 모델 이름 (ex. gpt-2-trump-torch-serving)
  "GPU_DEVICE_NUMBER": "" // GPU 장치 번호로, nvidia-smi를 통해 GPU 장치 번호를 확인한다. ex 1
}
```
- 해당 정보를 JSON 파일로 저장을 한다.(env.json)

## 시작
```
yarn start

// or

docker run -d --name worker \
 -v {env.json PATH}:/server/env.json -v /var/run/docker.sock:/var/run/docker.sock \
 --network host ainblockchain/worker-docker 
```


## 로그
```
docker logs -f worker
```

## 종료
```
docker rm -f worker {Model Name}
```

## 유닛 테스트 실행
```
yarn test
```

## 코드 스타일 검사
```
yarn lint
```


# 코드 구조 설명 (src)
- common: 공통으로 사용하는 모듈 및 변수 모음
- manager: 관리 로직 모음
- util: 기능 로직 모음
- _test_: 유닛 테스트 코드

<br>