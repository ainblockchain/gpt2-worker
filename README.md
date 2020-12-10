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

## 시작
```
yarn MNEMONIC={mnemonic} ETH_ADDRESS={ethereum address} \
 MODEL_NAME={Model Name} GPU_DEVICE_NUMBER={ex. 1} JOB_PORT={(optional): 4040)}  NODE_ENV={(optional): staging or prod} yarn start

// or

docker run -d --name worker \
 -e MNEMONIC={mnemonic} -e ETH_ADDRESS={ethereum address} \
 -e MODEL_NAME={Model Name} -e JOB_PORT={(optional, ex) 4040)  -e GPU_DEVICE_NUMBER={ex. 1}  -e NODE_ENV={(optional): staging or prod} \
 --network host  -v /var/run/docker.sock:/var/run/docker.sock ainblockchain/worker-docker 
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