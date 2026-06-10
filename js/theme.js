// 曜日別テーマ定義
// [0:日, 1:月, 2:火, 3:水, 4:木, 5:金, 6:土]
const dailyThemes = [
    { // 0: 日曜日 (日/Sun) ☀️
        name: '', symbol: '☀️',
        gradient: 'linear-gradient(135deg, #FFD700 0%, #FFA500 60%, #FF8C00 100%)',
        header: '#f4d26c', main: '#FFD700', text: '#333', contrast: '#dc3545', task: '#FF4500', time: '#FFD700',
    },
    { // 1: 月曜日 (月/Moon) 🌙
        name: '', symbol: '🌙',
        gradient: 'linear-gradient(135deg, #708090 0%, #B0C4DE 60%, #E6E6FA 100%)',
        header: '#36454F', main: '#708090', text: '#333', contrast: '#dc3545', task: '#B0C4DE', time: '#FFD700',
    },
    { // 2: 火曜日 (火/Fire) 🔥
        name: '', symbol: '🔥',
        gradient: 'linear-gradient(135deg, #8B0000 0%, #FF4500 60%, #FFD700 100%)',
        header: '#8B0000', main: '#FF4500', text: '#eee', contrast: '#FFD700', task: '#FF8C00', time: '#8B0000',
    },
    { // 3: 水曜日 (水/Water) 💧
        name: '', symbol: '💧',
        gradient: 'linear-gradient(135deg, #0056b3 0%, #007bff 60%, #87CEEB 100%)',
        header: '#00447C', main: '#007bff', text: '#333', contrast: '#dc3545', task: '#17a2b8', time: '#20c997',
    },
    { // 4: 木曜日 (木/Forest) 🌳
        name: '', symbol: '🌳',
        gradient: 'linear-gradient(135deg, #2c5234 0%, #4B8E4F 60%, #a2d2a6 100%)',
        header: '#4B3726', main: '#28a745', text: '#343a40', contrast: '#dc3545', task: '#6c757d', time: '#ffc107',
    },
    { // 5: 金曜日 (金/Gold) ✨
        name: '', symbol: '✨',
        gradient: 'linear-gradient(135deg, #DAA520 0%, #FFEC8B 60%, #F0E68C 100%)',
        header: '#B8860B', main: '#FFD700', text: '#333', contrast: '#dc3545', task: '#BDB76B', time: '#DAA520',
    },
    { // 6: 土曜日 (土/Earth) ⛰️
        name: '', symbol: '⛰️',
        gradient: 'linear-gradient(135deg, #A0522D 0%, #D2B48C 60%, #FFEBCD 100%)',
        header: '#8B4513', main: '#A0522D', text: '#333', contrast: '#dc3545', task: '#696969', time: '#D2B48C',
    }
];

export function applyDailyTheme() {
    const today = new Date().getDay(); // 0 (日曜日) から 6 (土曜日)
    const theme = dailyThemes[today];
    const root = document.documentElement;

    // CSS変数の設定
    root.style.setProperty('--main-bg-gradient', theme.gradient);
    root.style.setProperty('--header-bg', theme.header);
    root.style.setProperty('--main-color', theme.main);
    root.style.setProperty('--text-color', theme.text);
    root.style.setProperty('--contrast-color', theme.contrast);
    root.style.setProperty('--task-color', theme.task);
    root.style.setProperty('--time-color', theme.time);
    
    // ヘッダータイトルと全体タイトルの設定
    document.getElementById('header-title').textContent = `${theme.symbol} ${theme.name} スケジュール＆タスク帳`;
    
    // H1の色の動的調整
    if (today === 2) { 
         root.style.setProperty('--header-title-color', '#FFD700'); 
    } else { 
         root.style.setProperty('--header-title-color', 'white');
    }
    
    document.body.style.color = theme.text;
    
    // 火曜日テーマ (火/Fire) のみ、コンテンツ背景を暗く調整
    if (today === 2) {
        root.style.setProperty('--active-tab-bg', 'rgba(0,0,0,0.9)');
        document.querySelectorAll('.content-section').forEach(section => {
             section.style.backgroundColor = 'rgba(0,0,0,0.9)';
        });
        document.querySelectorAll('.tab-button').forEach(btn => {
             btn.style.color = '#eee';
        });
    } else {
         root.style.setProperty('--active-tab-bg', '#f8f9fa');
         document.querySelectorAll('.content-section').forEach(section => {
             section.style.backgroundColor = 'var(--active-tab-bg)';
        });
    }
}