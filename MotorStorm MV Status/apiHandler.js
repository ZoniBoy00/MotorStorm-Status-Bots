const axios = require("axios")
const { parsePlayerName } = require("./utils")

/**
 * Fetch server data from the API for MotorStorm Monument Valley.
 */
async function fetchServerData(retries = 3, delay = 10000, debug = false) {
  try {
    if (debug) console.log(`Fetching server data...`)

    // Fetch data for MotorStorm MV (applicationId: 20764)
    const mvRoomsResponse = await axios.get("https://api.psrewired.com/us/api/rooms?applicationId=20764")
    const mvPlayersResponse = await axios.get("https://api.psrewired.com/us/api/universes/players?applicationId=20764")
    const mvUniverseResponse = await axios.get("https://api.psrewired.com/us/api/universes?applicationId=20764")

    if (debug) console.log(`Server data fetched successfully.`)

    // Parse data for MotorStorm MV
    const mvRoomsData = mvRoomsResponse.data
    const mvPlayersData = mvPlayersResponse.data.map((player) => parsePlayerName(player.name))
    const mvUniverseData = mvUniverseResponse.data[0]

    if (debug) {
      console.log(`\nAPI Response Summary:`)
      console.log(`Rooms found: ${mvRoomsData.length}`)
      console.log(`Universe players: ${mvPlayersData.length}`)
      console.log(`Universe player count: ${mvUniverseData.playerCount}`)

      mvRoomsData.forEach((room, index) => {
        console.log(`Room ${index + 1}: ${room.name} - ${room.playerCount}/${room.maxPlayers} players`)
      })
    }

    const mvLobbies = await processRooms(mvRoomsData, mvPlayersData, debug)

    // Calculate total players from lobbies
    const totalPlayersInLobbies = mvLobbies.reduce((sum, lobby) => sum + lobby.player_count, 0)

    return {
      motorstorm_mv: {
        general_lobby: {
          name: mvUniverseData.name || "MotorStorm NTSC",
          player_count: mvUniverseData.playerCount,
          players: mvPlayersData,
        },
        lobbies: mvLobbies,
        summary: {
          active_lobbies: mvLobbies.filter((lobby) => lobby.is_active).length,
          total_players: totalPlayersInLobbies,
        },
      },
    }
  } catch (error) {
    if (retries > 0) {
      if (debug) console.warn(`Retrying fetchServerData... Retries left: ${retries}`)
      await new Promise((resolve) => setTimeout(resolve, delay))
      return fetchServerData(retries - 1, delay, debug)
    } else {
      console.error("Error fetching server data:", error.response ? error.response.data : error.message)
      return null
    }
  }
}

/**
 * Process rooms data and extract lobby information.
 */
async function processRooms(roomsData, allPlayers, debug = false) {
  const lobbies = []

  if (debug) {
    console.log(`Processing ${roomsData.length} rooms...`)
    console.log(`Total players from universe: ${allPlayers.length}`)
  }

  for (const room of roomsData) {
    try {
      const roomId = room.id
      const baseRoomName = room.name || "Unknown Lobby"
      const playerCount = room.playerCount || 0
      const maxPlayers = room.maxPlayers || 12

      if (debug) {
        console.log(`\nProcessing room: ${baseRoomName} (ID: ${roomId})`)
        console.log(`Room player count from /rooms: ${playerCount}`)
      }

      // Fetch player data for this specific room
      const roomPlayersResponse = await axios.get(`https://api.psrewired.com/us/api/rooms/${roomId}`)
      const roomPlayersData = roomPlayersResponse.data

      if (debug) {
        console.log(`Room data type:`, typeof roomPlayersData)
        console.log(`Room data length:`, Array.isArray(roomPlayersData) ? roomPlayersData.length : "N/A")
      }

      // Handle the case where the room contains multiple sub-lobbies
      if (Array.isArray(roomPlayersData) && roomPlayersData.length > 0) {
        // Each item in the array is a separate lobby
        for (const subLobby of roomPlayersData) {
          const lobbyName = subLobby.name || baseRoomName
          const lobbyPlayerCount = subLobby.playerCount || 0
          const lobbyMaxPlayers = subLobby.maxPlayers || maxPlayers

          // Extract players for this specific sub-lobby
          let lobbyPlayers = []
          if (subLobby.players && Array.isArray(subLobby.players)) {
            lobbyPlayers = subLobby.players.map((player) => parsePlayerName(player.name))
          }

          if (debug) {
            console.log(`Found sub-lobby: ${lobbyName} with ${lobbyPlayerCount} players`)
            console.log(`Players:`, lobbyPlayers)
          }

          lobbies.push({
            name: lobbyName,
            player_count: lobbyPlayerCount,
            max_players: lobbyMaxPlayers,
            players: lobbyPlayers,
            is_active: lobbyPlayerCount > 0,
          })
        }
      } else if (typeof roomPlayersData === "object" && roomPlayersData.players) {
        // Single lobby format
        const lobbyPlayers = roomPlayersData.players.map((player) => parsePlayerName(player.name))

        lobbies.push({
          name: roomPlayersData.name || baseRoomName,
          player_count: roomPlayersData.playerCount || playerCount,
          max_players: roomPlayersData.maxPlayers || maxPlayers,
          players: lobbyPlayers,
          is_active: (roomPlayersData.playerCount || playerCount) > 0,
        })
      } else if (playerCount === 0) {
        // Empty room
        lobbies.push({
          name: baseRoomName,
          player_count: 0,
          max_players: maxPlayers,
          players: [],
          is_active: false,
        })
      }
    } catch (error) {
      console.error(`Error processing room with ID ${room.id}:`, error.message)

      // Still add the lobby even if we can't fetch detailed player info
      lobbies.push({
        name: room.name || "Unknown Lobby",
        player_count: room.playerCount || 0,
        max_players: room.maxPlayers || 12,
        players: [],
        is_active: (room.playerCount || 0) > 0,
      })
    }
  }

  if (debug) {
    console.log(`\nFinal lobbies:`)
    lobbies.forEach((lobby) => {
      console.log(`- ${lobby.name}: ${lobby.player_count}/${lobby.max_players} players`)
    })
  }

  return lobbies
}

module.exports = { fetchServerData }
