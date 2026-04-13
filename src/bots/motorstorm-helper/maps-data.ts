export interface MotorStormMap {
    name: string;
    category: string;
}

export interface MotorStormGameData {
    title: string;
    maps: MotorStormMap[];
}

export const MOTORSTORM_MAPS: Record<string, MotorStormGameData> = {
    mv: {
        title: 'MotorStorm: Monument Valley',
         maps: [
            { name: 'Coyote Rage', category: 'Original Track' },
            { name: 'Dust Devil', category: 'Original Track' },
            { name: 'RainGod Mesa', category: 'Original Track' },
            { name: 'Rockhopper', category: 'Original Track' },
            { name: 'Sidewinder Gulch', category: 'Original Track' },
            { name: 'Tenderizer', category: 'Original Track' },
            { name: 'The Grizzly', category: 'Original Track' },
            { name: 'Mudpool', category: 'Original Track' },
            { name: 'Coyote Revenge', category: 'DLC Track' },
            { name: 'Devil\'s Crossing', category: 'DLC Track' },
            { name: 'Diamondback Speedway', category: 'DLC Track' },
            { name: 'Eagle\'s Nest', category: 'DLC Track' }
        ]
    },
    pr: {
        title: 'MotorStorm: Pacific Rift',
        maps: [
            { name: 'Kanaloa Bay', category: 'Original Track' },
            { name: 'Razorback', category: 'Original Track' },
            { name: 'Mudslide', category: 'Original Track' },
            { name: 'Sugar Rush', category: 'Original Track' },
            { name: 'Caldera Ridge', category: 'Original Track' },
            { name: 'Badlands', category: 'Original Track' },
            { name: 'RainGod Spires', category: 'Original Track' },
            { name: 'The Edge', category: 'Original Track' },
            { name: 'Wildfire', category: 'Original Track' },
            { name: 'Paradise Beach', category: 'Original Track' },
            { name: 'The Rift', category: 'Original Track' },
            { name: 'Scorched', category: 'Original Track' },
            { name: 'Cascade Falls', category: 'Original Track' },
            { name: 'Beachcomber', category: 'Original Track' },
            { name: 'Riptide', category: 'Original Track' },
            { name: 'Colossus Canyon', category: 'Original Track' },
            { name: 'Reef Runner', category: 'DLC Track' },
            { name: 'Brimstone', category: 'DLC Track' },
            { name: 'Hollowed Earth', category: 'DLC Track' },
            { name: 'Quicksands', category: 'DLC Track' },
            { name: 'Dark Fire Swamp', category: 'DLC Track' },
            { name: 'Engorged', category: 'DLC Track' }
        ]
    },
    ae: {
        title: 'MotorStorm: Arctic Edge',
        maps: [
            { name: 'Gold Rush', category: 'Original Track' },
            { name: 'Log Jam', category: 'Original Track' },
            { name: 'Mud Bowl', category: 'Original Track' },
            { name: 'Widow Maker', category: 'Original Track' },
            { name: 'Eagle Falls', category: 'Original Track' },
            { name: 'WolfPack Mountain', category: 'Original Track' },
            { name: 'Ascension', category: 'Original Track' },
            { name: 'Anguta Glacier', category: 'Original Track' },
            { name: 'The Chasm', category: 'Original Track' },
            { name: 'Northern Face', category: 'Original Track' },
            { name: 'Snowgod Canyon', category: 'Original Track' },
            { name: 'Vertigo', category: 'Original Track' }
        ]
    },
    apoc: {
        title: 'MotorStorm: Apocalypse',
        maps: [
            { name: 'Boardwalk', category: 'Original Track' },
            { name: 'Docklands', category: 'Original Track' },
            { name: 'Downtown', category: 'Original Track' },
            { name: 'Good Herb', category: 'Original Track' },
            { name: 'Interstate', category: 'Original Track' },
            { name: 'Mainline', category: 'Original Track' },
            { name: 'Skyline', category: 'Original Track' },
            { name: 'Terminus', category: 'Original Track' },
            { name: 'Upper Bohemia', category: 'Original Track' },
            { name: 'The Rock', category: 'DLC Track' },
            { name: 'Route 666', category: 'DLC Track' }
        ]
    }
};
