self.addEventListener('message', function(e) {
    const { hour, minutes } = e.data;
    
    const formattedMinutes = minutes
        .sort((a, b) => a - b)
        .map(min => min.toString().padStart(2, '0'))
        .join('&nbsp;&nbsp;&nbsp;');

    const html = `
        <div class="schedule-row" data-hour="${hour}">
            <span class="hour-label">${hour}h</span>
            <span class="minutes-container">${formattedMinutes}</span>
        </div>
    `;

    self.postMessage({ html });
});