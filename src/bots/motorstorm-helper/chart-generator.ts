import { ActivitySnapshot } from '../../types';

interface QuickChartResponse {
  success: boolean;
  url: string;
}

export class ChartGenerator {
  private readonly QUICKCHART_API = 'https://quickchart.io/chart/create';

  private async generateShortChartUrl(config: any): Promise<string> {
    try {
      const response = await fetch(this.QUICKCHART_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          backgroundColor: '#1e1e2e',
          width: 900,
          height: 450,
          format: 'png',
          chart: config,
        }),
      });

      if (!response.ok) {
        throw new Error(`QuickChart API error: ${response.statusText}`);
      }

      const result = await response.json() as QuickChartResponse;
      return result.url;
    } catch (error) {
      console.error('Failed to generate chart:', error);
      // Fallback to direct encoding if API fails
      const encodedConfig = encodeURIComponent(JSON.stringify(config)).substring(0, 1800);
      return `https://quickchart.io/chart?c=${encodedConfig}&w=900&h=450&bkg=%231e1e2e`;
    }
  }

  public async generateActivityChart(snapshots: ActivitySnapshot[]): Promise<string> {
    if (snapshots.length === 0) {
      return this.generateNoDataChart('No activity data available');
    }

    const labels = snapshots.map(s => {
      const date = new Date(s.timestamp);
      return date.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit' 
      });
    });

    const totalData = snapshots.map(s => s.totalPlayers);
    const aeData = snapshots.map(s => s.ae.players.length);
    const apocData = snapshots.map(s => s.apoc.players.length);
    const prData = snapshots.map(s => s.pr.players.length);
    const mvData = snapshots.map(s => s.mv.players.length);

    const config = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Total Players',
            data: totalData,
            borderColor: '#89b4fa',
            backgroundColor: 'rgba(137, 180, 250, 0.2)',
            borderWidth: 3,
            pointRadius: 4,
            pointBackgroundColor: '#89b4fa',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            tension: 0.3,
            fill: true,
          },
          {
            label: 'Arctic Edge',
            data: aeData,
            borderColor: '#00d4ff',
            borderWidth: 2,
            pointRadius: 2,
            tension: 0.3,
          },
          {
            label: 'Apocalypse',
            data: apocData,
            borderColor: '#ff6b00',
            borderWidth: 2,
            pointRadius: 2,
            tension: 0.3,
          },
          {
            label: 'Pacific Rift',
            data: prData,
            borderColor: '#00ff6b',
            borderWidth: 2,
            pointRadius: 2,
            tension: 0.3,
          },
          {
            label: 'Monument Valley',
            data: mvData,
            borderColor: '#d400ff',
            borderWidth: 2,
            pointRadius: 2,
            tension: 0.3,
          },
        ],
      },
      options: {
        plugins: {
          title: {
            display: true,
            text: 'Player Activity',
            color: '#fff',
            font: { size: 20, weight: 'bold' },
          },
          legend: {
            display: true,
            position: 'bottom',
            labels: { 
              color: '#fff',
              font: { size: 11 },
              padding: 10,
              usePointStyle: true,
            },
          },
        },
        scales: {
          x: {
            ticks: { 
              color: '#cdd6f4',
              font: { size: 10 },
              maxRotation: 45,
            },
            grid: { color: 'rgba(255,255,255,0.1)' },
          },
          y: {
            beginAtZero: true,
            ticks: { color: '#cdd6f4', font: { size: 11 }, stepSize: 1 },
            grid: { color: 'rgba(255,255,255,0.15)' },
          },
        },
      },
    };

    return await this.generateShortChartUrl(config);
  }

  public async generatePeakTimesChart(hourData: { hour: number; count: number }[]): Promise<string> {
    // Ensure all 24 hours are represented
    const fullHourData = Array.from({ length: 24 }, (_, i) => {
      const found = hourData.find(d => d.hour === i);
      return { hour: i, count: found ? found.count : 0 };
    });

    const labels = fullHourData.map(d => {
      const hour12 = d.hour % 12 || 12;
      const ampm = d.hour < 12 ? 'AM' : 'PM';
      return `${hour12} ${ampm}`;
    });
    const data = fullHourData.map(d => d.count);
    const maxCount = Math.max(...data);

    // Color gradient based on activity level
    const backgroundColors = data.map(count => {
      const intensity = count / maxCount;
      if (intensity > 0.7) return '#f38ba8'; // High activity - red
      if (intensity > 0.4) return '#fab387'; // Medium activity - orange
      return '#89b4fa'; // Low activity - blue
    });

    const config = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Activity',
            data,
            backgroundColor: backgroundColors,
            borderWidth: 0,
            borderRadius: 4,
          },
        ],
      },
      options: {
        plugins: {
          title: {
            display: true,
            text: 'Peak Times (24h)',
            color: '#fff',
            font: { size: 20, weight: 'bold' },
          },
          legend: { display: false },
        },
        scales: {
          x: {
            ticks: { color: '#cdd6f4', font: { size: 10 } },
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            ticks: { color: '#cdd6f4', font: { size: 11 } },
            grid: { color: 'rgba(255,255,255,0.1)' },
          },
        },
      },
    };

    return await this.generateShortChartUrl(config);
  }

  public async generateGameDistributionChart(
    games: { ae: number; apoc: number; pr: number; mv: number }
  ): Promise<string> {
    const total = games.ae + games.apoc + games.pr + games.mv;

    if (total === 0) {
      return this.generateNoDataChart('No game data available');
    }

    const data = [games.ae, games.apoc, games.pr, games.mv];
    const percentages = data.map(count => ((count / total) * 100).toFixed(1));

    const config = {
      type: 'doughnut',
      data: {
        labels: [
          `AE (${percentages[0]}%)`,
          `Apoc (${percentages[1]}%)`,
          `PR (${percentages[2]}%)`,
          `MV (${percentages[3]}%)`
        ],
        datasets: [
          {
            data,
            backgroundColor: ['#00d4ff', '#ff6b00', '#00ff6b', '#d400ff'],
            borderColor: '#1e1e2e',
            borderWidth: 3,
          },
        ],
      },
      options: {
        plugins: {
          title: {
            display: true,
            text: 'Game Distribution',
            color: '#fff',
            font: { size: 20, weight: 'bold' },
          },
          legend: {
            position: 'bottom',
            labels: { 
              color: '#fff',
              font: { size: 12 },
              padding: 10,
            },
          },
        },
      },
    };

    return await this.generateShortChartUrl(config);
  }

  public async generateWeekdayChart(dayData: { day: number; count: number }[]): Promise<string> {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Ensure all days are represented
    const fullDayData = Array.from({ length: 7 }, (_, i) => {
      const found = dayData.find(d => d.day === i);
      return { day: i, count: found ? found.count : 0 };
    });

    const labels = fullDayData.map(d => dayNames[d.day]);
    const data = fullDayData.map(d => d.count);

    const config = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Activity',
            data,
            backgroundColor: '#a6e3a1',
            borderWidth: 0,
            borderRadius: 6,
          },
        ],
      },
      options: {
        plugins: {
          title: {
            display: true,
            text: 'Activity by Day',
            color: '#fff',
            font: { size: 20, weight: 'bold' },
          },
          legend: { display: false },
        },
        scales: {
          x: {
            ticks: { color: '#cdd6f4', font: { size: 11 } },
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            ticks: { color: '#cdd6f4', font: { size: 11 } },
            grid: { color: 'rgba(255,255,255,0.1)' },
          },
        },
      },
    };

    return await this.generateShortChartUrl(config);
  }

  public async generateSessionDurationChart(avgDuration: number, distribution: { range: string; count: number }[]): Promise<string> {
    const labels = distribution.map(d => d.range);
    const data = distribution.map(d => d.count);

    const config = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Sessions',
            data,
            backgroundColor: '#cba6f7',
            borderWidth: 0,
            borderRadius: 5,
          },
        ],
      },
      options: {
        plugins: {
          title: {
            display: true,
            text: `Session Duration Distribution (Avg: ${Math.round(avgDuration)}min)`,
            color: '#fff',
            font: { size: 18, weight: 'bold' },
          },
          legend: { display: false },
        },
        scales: {
          x: {
            ticks: { color: '#cdd6f4', font: { size: 11 } },
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            ticks: { color: '#cdd6f4', font: { size: 11 } },
            grid: { color: 'rgba(255,255,255,0.1)' },
          },
        },
      },
    };

    return await this.generateShortChartUrl(config);
  }

  public async generateRetentionChart(retentionData: { period: string; rate: number }[]): Promise<string> {
    const labels = retentionData.map(d => d.period);
    const data = retentionData.map(d => d.rate);

    const config = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Retention Rate (%)',
            data,
            borderColor: '#a6e3a1',
            backgroundColor: 'rgba(166, 227, 161, 0.2)',
            borderWidth: 3,
            pointRadius: 5,
            pointBackgroundColor: '#a6e3a1',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            tension: 0.3,
            fill: true,
          },
        ],
      },
      options: {
        plugins: {
          title: {
            display: true,
            text: 'Player Retention Rate',
            color: '#fff',
            font: { size: 18, weight: 'bold' },
          },
          legend: { display: false },
        },
        scales: {
          x: {
            ticks: { color: '#cdd6f4', font: { size: 11 } },
            grid: { color: 'rgba(255,255,255,0.1)' },
          },
          y: {
            beginAtZero: true,
            max: 100,
            ticks: { 
              color: '#cdd6f4', 
              font: { size: 11 },
              callback: (value: number | string) => value + '%',
            },
            grid: { color: 'rgba(255,255,255,0.15)' },
          },
        },
      },
    };

    return await this.generateShortChartUrl(config);
  }

  public async generateLobbyStatsChart(lobbyData: { game: string; avgLobbies: number; maxLobbies: number }[]): Promise<string> {
    const labels = lobbyData.map(d => d.game);
    const avgData = lobbyData.map(d => d.avgLobbies);
    const maxData = lobbyData.map(d => d.maxLobbies);

    const config = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Average Lobbies',
            data: avgData,
            backgroundColor: '#89b4fa',
            borderWidth: 0,
            borderRadius: 4,
          },
          {
            label: 'Peak Lobbies',
            data: maxData,
            backgroundColor: '#f38ba8',
            borderWidth: 0,
            borderRadius: 4,
          },
        ],
      },
      options: {
        plugins: {
          title: {
            display: true,
            text: 'Lobby Statistics by Game',
            color: '#fff',
            font: { size: 18, weight: 'bold' },
          },
          legend: {
            position: 'bottom',
            labels: { 
              color: '#fff',
              font: { size: 11 },
              padding: 10,
            },
          },
        },
        scales: {
          x: {
            ticks: { color: '#cdd6f4', font: { size: 11 } },
            grid: { display: false },
          },
          y: {
            beginAtZero: true,
            ticks: { color: '#cdd6f4', font: { size: 11 }, stepSize: 1 },
            grid: { color: 'rgba(255,255,255,0.1)' },
          },
        },
      },
    };

    return await this.generateShortChartUrl(config);
  }

  public async generatePlayerGrowthChart(growthData: { date: string; players: number; change: number }[]): Promise<string> {
    const labels = growthData.map(d => d.date);
    const playerData = growthData.map(d => d.players);
    const changeData = growthData.map(d => d.change);

    const config = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Unique Players',
            data: playerData,
            borderColor: '#89b4fa',
            backgroundColor: 'rgba(137, 180, 250, 0.2)',
            borderWidth: 3,
            pointRadius: 4,
            tension: 0.3,
            yAxisID: 'y',
            fill: true,
          },
          {
            label: 'Daily Change',
            data: changeData,
            borderColor: '#f9e2af',
            borderWidth: 2,
            pointRadius: 3,
            tension: 0.3,
            yAxisID: 'y1',
            type: 'bar',
            backgroundColor: changeData.map(c => c >= 0 ? 'rgba(166, 227, 161, 0.6)' : 'rgba(243, 139, 168, 0.6)'),
          },
        ],
      },
      options: {
        plugins: {
          title: {
            display: true,
            text: 'Player Growth Trend',
            color: '#fff',
            font: { size: 18, weight: 'bold' },
          },
          legend: {
            position: 'bottom',
            labels: { 
              color: '#fff',
              font: { size: 11 },
              padding: 10,
            },
          },
        },
        scales: {
          x: {
            ticks: { color: '#cdd6f4', font: { size: 10 } },
            grid: { color: 'rgba(255,255,255,0.1)' },
          },
          y: {
            position: 'left',
            ticks: { color: '#cdd6f4', font: { size: 11 } },
            grid: { color: 'rgba(255,255,255,0.15)' },
          },
          y1: {
            position: 'right',
            ticks: { color: '#cdd6f4', font: { size: 11 } },
            grid: { display: false },
          },
        },
      },
    };

    return await this.generateShortChartUrl(config);
  }

  private async generateNoDataChart(message: string): Promise<string> {
    const config = {
      type: 'bar',
      data: {
        labels: [''],
        datasets: [{ label: '', data: [0], backgroundColor: '#313244' }],
      },
      options: {
        plugins: {
          title: {
            display: true,
            text: message,
            color: '#fff',
            font: { size: 20, weight: 'bold' },
          },
          legend: { display: false },
        },
        scales: { x: { display: false }, y: { display: false } },
      },
    };

    return await this.generateShortChartUrl(config);
  }
}
