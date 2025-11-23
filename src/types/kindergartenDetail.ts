// 유치원 상세 정보 타입 정의

export interface KindergartenDetailSummary {
  id: string
  name: string
  type: '공립' | '사립' | '법인' | '국공립'
  address: string
  phone?: string
  distanceKm?: number
  capacity?: number
  enrolled?: number
  classCount?: number
  teacherCount?: number
  ratio?: string // e.g., "1:12"
  customInfo?: {
    building_images?: string[]
    meal_images?: string[]
  }
  safety: { 
    lastCheckDate?: string
    issues?: number
    status?: '적합' | '조치' | '미상'
    // 안전점검 현황
    fireAvdYn?: string // 소방대피훈련여부
    fireAvdDt?: string // 소방대피훈련일자
    gasCkYn?: string // 가스점검여부
    gasCkDt?: string // 가스점검일자
    fireSafeYn?: string // 소방안전점검여부
    fireSafeDt?: string // 소방안전점검일자
    electCkYn?: string // 전기설비점검여부
    electCkDt?: string // 전기설비점검일자
    plygCkYn?: string // 놀이시설 안전검사 대상여부
    plygCkDt?: string // 놀이시설 안전검사 점검일자
    plygCkRsCd?: string // 놀이시설 안전검사 점검결과
    cctvIstYn?: string // CCTV 설치여부
    cctvIstTotal?: number // CCTV 총 설치수
    cctvIstIn?: number // CCTV 건물 안 설치수
    cctvIstOut?: number // CCTV 건물 밖 설치수
  }
  hygiene: { 
    lastCheckDate?: string
    status?: '적합' | '조치' | '미상'
  }
  meal: { 
    mode?: '자체' | '위탁' | '미상'
    hasDietitian?: boolean
    // 추가 급식 정보
    consEntsNm?: string // 위탁업체명
    ntrtTchrAgmtYn?: string // 영양교사배치여부
    sngeAgmtNtrtThcnt?: number // 단독배치영양교사수
    cprtAgmtNtrtThcnt?: number // 공동배치영양교사수
    cprtAgmtIttNm?: string // 공동배치기관명
    ckcnt?: number // 조리사수
    cmcnt?: number // 조리인력수
    masMsplDclrYn?: string // 집단급식소신고여부
  }
  bus: { 
    inOperation?: boolean
    vehicleCount?: number
    hasGuardian?: boolean
    dclrVhcnt?: number // 신고차량수
    psg9DclrVhcnt?: number // 9인승신고차량수
    psg12DclrVhcnt?: number // 12인승신고차량수
    psg15DclrVhcnt?: number // 15인승신고차량수
  }
  afterSchool: { 
    inOperation?: boolean
    programs?: string[]
    operatingHours?: string
    // 방과후과정현황
    inorClcnt?: number // 독립편성학급수
    pmRrgnClcnt?: number // 오후재편성학급수
    operTime?: string // 운영시간
    inorPtcKpcnt?: number // 독립편성참여원아수
    pmRrgnPtcKpcnt?: number // 오후재편성참여원아수
    fxrlThcnt?: number // 정규교사수
    shcntThcnt?: number // 기간제교사수
    incnt?: number // 전담사수
  }
  safetyEducation?: {
    // 안전교육 현황
    pbntSemScCd?: string // 학기
    safeTpCd1?: string // 생활안전교육
    safeTpCd2?: string // 교통안전교육
    safeTpCd3?: string // 폭력예방 및 신변보호교육
    safeTpCd4?: string // 약물중독예방교육
    safeTpCd5?: string // 사이버중독예방교육
    safeTpCd6?: string // 재난안전교육
    safeTpCd7?: string // 직업안전교육
    safeTpCd8?: string // 응급처치교육
  }
  teachers?: {
    principal?: number // 원장수
    vicePrincipal?: number // 원감수
    generalTeacher?: number // 일반교사수
    specialTeacher?: number // 특수교사수
    healthTeacher?: number // 보건교사수
    nutritionTeacher?: number // 영양교사수
    contractTeacher?: number // 기간제교사/강사수
    staff?: number // 사무직원수
    // 근속연수현황
    yy1UndrThcnt?: number // 1년미만교사수
    yy1AbvYy2UndrThcnt?: number // 1년이상2년미만교사수
    yy2AbvYy4UndrThcnt?: number // 2년이상4년미만교사수
    yy4AbvYy6UndrThcnt?: number // 4년이상6년미만교사수
    yy6AbvThcnt?: number // 6년이상교사수
  }
  lastSyncedAt: string
  // 추가 정보
  rppnname?: string // 대표자명
  ldgrname?: string // 원장명
  edate?: string // 설립일
  odate?: string // 개원일
}

// 기본 정보 탭
export interface BasicInfo {
  establishment: string
  establishmentType: string
  capacity: number
  enrolled: number
  classCount: number
  address: string
  phone: string
  website?: string
  buildingInfo?: {
    floors?: number
    playground?: boolean
    classroomCount?: number
  }
}

// 교사진·학급 탭
export interface TeacherInfo {
  teacherCount: number
  studentCount: number
  ratio: string
  qualificationRate?: number
  averageExperience?: number
  teacherDetails?: Array<{
    position: string
    qualification: string
    count: number
  }>
}

// 급식·통학 탭
export interface MealInfo {
  mode: '자체' | '위탁' | '미상'
  hasDietitian: boolean
  kitchenHygiene?: string
}

export interface TransportationInfo {
  inOperation: boolean
  vehicleCount: number
  hasGuardian: boolean
  safetyEquipment?: string[]
}

// 안전·보험 탭
export interface SafetyInfo {
  environmentHygiene: {
    lastCheckDate?: string
    status?: '적합' | '조치' | '미상'
    details?: string
  }
  safetyCheck: {
    lastCheckDate?: string
    issues?: number
    details?: string
  }
  safetyEducation: {
    lastEducationDate?: string
    frequency?: number
    details?: string
  }
}

export interface InsuranceInfo {
  deductionSociety: {
    joined: boolean
    details?: string
  }
  insurance: {
    types: Array<{
      name: string
      joined: boolean
      details?: string
    }>
  }
}

// 운영정보 탭
export interface OperationInfo {
  lessonDays: {
    totalDays?: number
    details?: string
  }
  afterSchool: {
    inOperation: boolean
    programs: Array<{
      name: string
      operatingHours: string
      details?: string
    }>
  }
}

// API 응답 타입들
export interface GeneralInfoResponse {
  status: string
  kinderInfo: Array<{
    kindercode: string
    kindername: string
    establish: string
    officeedu: string
    addr: string
    telno: string
    hpaddr: string
    opertime: string
    prmstfcnt: string
    ag3fpcnt: string
    ag4fpcnt: string
    ag5fpcnt: string
    lttdcdnt: string
    lngtcdnt: string
  }>
}

export interface BuildingInfoResponse {
  status: string
  kinderInfo: Array<{
    kindercode: string
    floorcnt: string
    playground: string
    classroomcnt: string
  }>
}

export interface TeacherInfoResponse {
  status: string
  kinderInfo: Array<{
    kindercode: string
    position: string
    qualification: string
    cnt: string
  }>
}

export interface MealInfoResponse {
  status: string
  kinderInfo: Array<{
    kindercode: string
    mealtype: string
    dietitian: string
    allergy: string
  }>
}

export interface TransportationInfoResponse {
  status: string
  kinderInfo: Array<{
    kindercode: string
    busoperation: string
    buscnt: string
    guardian: string
  }>
}

export interface SafetyInfoResponse {
  status: string
  kinderInfo: Array<{
    kindercode: string
    checkdate: string
    result: string
    details: string
  }>
}

export interface InsuranceInfoResponse {
  status: string
  kinderInfo: Array<{
    kindercode: string
    insurancetype: string
    joined: string
    details: string
  }>
}

export interface AfterSchoolInfoResponse {
  status: string
  kinderInfo: Array<{
    kindercode: string
    programname: string
    operatingtime: string
    details: string
  }>
}
