document.addEventListener('DOMContentLoaded', function () {
    const hamburgerButton = document.getElementById('hamburger-button');
    const sideMenu = document.getElementById('side-menu');
    const closeButton = document.querySelector('#side-menu .close-button');

    const lightAutoButton = document.getElementById('light-auto-button');

    // Show side menu and hide hamburger button
    hamburgerButton.addEventListener('click', function () {
        play_sound();
        sideMenu.classList.add('show');
        hamburgerButton.style.opacity = '0'; // Hide hamburger button
    });

    // Hide side menu and show hamburger button
    closeButton.addEventListener('click', function () {
        play_sound();
        sideMenu.classList.remove('show');
        hamburgerButton.style.opacity = '1'; // Show hamburger button
    });

    lightAutoButton.addEventListener('click', function () {
        sideMenu.classList.remove('show');
        hamburgerButton.style.opacity = '1'; // Show hamburger button
    });

    // Function to update the flow rate
    function updateFlowRate() {
        const flowRateElement = document.getElementById('flow-rate');
        const newFlowRate = (Math.random() * 10).toFixed(2);
        flowRateElement.textContent = `${newFlowRate} L/s`;
    }

    // Function to update temperature and humidity
    function updateTemperatureAndHumidity() {
        const temperatureElement = document.getElementById('temperature');
        const humidityElement = document.getElementById('humidity');
        const newTemperature = (Math.random() * 35).toFixed(1);
        const newHumidity = (Math.random() * 100).toFixed(1);
        temperatureElement.textContent = `${newTemperature} °C`;
        humidityElement.textContent = `${newHumidity} %`;
    }

    // Function to update CO2 sensor value
    function updateCO2Sensor() {
        const co2SensorElement = document.getElementById('co2-sensor');
        const newCO2Value = (Math.random() * 1000).toFixed(0); // Example value in ppm
        co2SensorElement.textContent = `${newCO2Value} ppm`;
    }

    // Function to update Level sensor value
    function updateLevel() {
        const levelElement = document.getElementById('level');
        const newLevel = (Math.random() * 100).toFixed(1); // Example value in cm
        levelElement.textContent = `${newLevel} cm`;
    }

    // Function to update TVOC sensor value
    function updateTVOC() {
        const tvocElement = document.getElementById('tvoc');
        const newTVOC = (Math.random() * 500).toFixed(0); // Example value in ppb
        tvocElement.textContent = `${newTVOC} ppb`;
    }

    // Function to update the current time
    function updateTime() {
        const currentTimeElement = document.getElementById('current-time');
        const now = new Date();
        const formattedDate = now.toLocaleDateString(); // Format: YYYY/MM/DD
        const formattedTime = now.toLocaleTimeString(); // Format: HH:MM:SS
        currentTimeElement.textContent = `${formattedDate} ${formattedTime}`;
    }

    // Set interval to update time every second
    setInterval(updateTime, 1000);

    // Set interval to update sensor values every second
    //setInterval(() => {
    //    updateFlowRate();
    //    updateTemperatureAndHumidity();
    //    updateCO2Sensor();
    //    updateLevel();
    //    updateTVOC();
    //}, 1000);

    // Initial data update
    //updateFlowRate();
    //updateTemperatureAndHumidity();
    //updateCO2Sensor();
    //updateLevel();
    //updateTVOC();
    // 모달 관련 변수 설정
    const modal = document.getElementById('modal');
    const openModalImage = document.getElementById('open-modal-image');
    const closeModalButton = document.querySelector('.modal .close');

    // 모달 열기
    openModalImage.addEventListener('click', function () {
        play_sound();
        modal.style.display = 'block';
        document.getElementById('esp32cam').src = "http://192.168.0.105:60000/video_feed";
    });

    // 모달 닫기
    closeModalButton.addEventListener('click', function () {
        play_sound();
        modal.style.display = 'none';
        document.getElementById('esp32cam').src = "";
    });

    // 모달 외부 클릭 시 닫기
    window.addEventListener('click', function (event) {
        play_sound();
        if (event.target === modal) {
            modal.style.display = 'none';
            document.getElementById('esp32cam').src = "";
        }
    });
});
