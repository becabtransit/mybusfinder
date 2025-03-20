self.onmessage = function(e) {
    if (e.data.type === 'routes') {
        const routes = {};
        const lines = e.data.data.split('\n');
        const headers = lines[0].split(',');
        const indices = {
            routeId: headers.indexOf('route_id'),
            shortName: headers.indexOf('route_short_name'),
            longName: headers.indexOf('route_long_name'),
            routeColor: headers.indexOf('route_color'),
            routeTextColor: headers.indexOf('route_text_color')
        };

        lines.slice(1).forEach(line => {
            const values = line.trim().split(',');
            const routeId = values[indices.routeId];
            if (routeId) {
                routes[routeId] = {
                    short_name: indices.shortName !== -1 ? values[indices.shortName] : '',
                    long_name: indices.longName !== -1 ? values[indices.longName].replace(/\"/g, '') : '',
                    route_color: indices.routeColor !== -1 ? `#${values[indices.routeColor]}` : '#FFFFFF',
                    route_text_color: indices.routeTextColor !== -1 ? `#${values[indices.routeTextColor]}` : '#000000'
                };
            }
        });

        self.postMessage(rouotes);
    }
};