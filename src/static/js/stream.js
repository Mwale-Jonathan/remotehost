let path = window.location.pathname.split('/')
const channel = path[3]
const APP_ID = '62d9d77bb2804f1394a8b61e6dab1819'
const client = AgoraRTC.createClient({mode:'rtc', codec:'vp8'})
let localTracks = []
let remoteUsers = []

// Get Agora user token for django
let getToken = async () => {
    let res = await fetch(`${window.location.origin}/meetings/get_token/?channel=${channel}`);
    let data = await res.json()
    await sessionStorage.setItem('uid', data.uid)
    await sessionStorage.setItem('token', data.token)
    await sessionStorage.setItem('channel', data.channel)
    await sessionStorage.setItem('name', data.username)
}

getToken()

// Join the local user to the stream
let joinAndDisplayLocalStream = async () => {
    let UID = Number(await sessionStorage.getItem('uid'));
    const TOKEN = await sessionStorage.getItem('token')
    const NAME = await sessionStorage.getItem('name')
    const CHANNEL = await sessionStorage.getItem('channel')

    client.on('user-published', handleUserJoined)
    client.on('user-left', handleUserLeft)

    try {
        console.log(APP_ID, CHANNEL, TOKEN, UID)
        await client.join(APP_ID, CHANNEL, TOKEN, UID)
    } catch (error) {
        console.error('join error', error)
        // window.open('/lobby/', '_self')
    }

    localTracks = await AgoraRTC.createMicrophoneAndCameraTracks()

    let member = await createMeetingMember()

    let player = `
        <div class="video-container" id="user-container-${UID}">
            <div class="username">
                <span class="user-name">${member.name}</span>
            </div>
            <div class="video-player" id="user-${UID}"></div>
        </div>
    `
    document.getElementById('video-streams').insertAdjacentHTML('beforeend', player)
    localTracks[1].play(`user-${UID}`)
    await client.publish([localTracks[0], localTracks[1]])
}


// Handle a new remote user joining the stream
let handleUserJoined = async (user, mediaType) => {
    remoteUsers[user.id] = user
    await client.subscribe(user, mediaType)

    if (mediaType === 'video') {
        let player = document.getElementById(`user-container-${user.uid}`);
        if (player != null) {
            player.remove()
        }

        let member = await getMeetingMember(user)

        player = `
            <div class="video-container" id="user-container-${user.uid}">
                <div class="username">
                    <span class="user-name">${member.name}</span>
                </div>
                <div class="video-player" id="user-${user.uid}"></div>
            </div>
        `
        document.getElementById('video-streams').insertAdjacentHTML('beforeend', player)
        user.videoTrack.play(`user-${user.uid}`)
    }

    if (mediaType === 'audio') {
        user.audioTrack.play()
    }
}

// Handle a remote user leaving the stream
let handleUserLeft = async(user) => {
    delete remoteUsers[user.uid]
    document.getElementById(`user-container-${user.uid}`).remove()
}

// Handle localuser leaving the stream
let leaveAndRemoveLocalStream = async() => {
    for (let i=0; localTracks.length > i; i++) {
        localTracks[i].stop()
        localTracks[i].close()
    }

    await client.leave()
    deleteMeetingMember()
    window.open('/lobby', '_self')
}

// Toggle the camera
let toggleCamera = async (e) => {
    if (localTracks[1].muted) {
        await localTracks[1].setMuted(false)
        let camera = document.getElementById('camera-btn');
        camera.classList.remove('btn-danger')
        camera.classList.add('btn-success-dark')
    } else {
        await localTracks[1].setMuted(true)
        let camera = document.getElementById('camera-btn');
        camera.classList.remove('btn-success-dark')
        camera.classList.add('btn-danger')
    }
}

// Toggle the Microphone
let toggleMicrophone = async (e) => {
    if (localTracks[0].muted) {
        await localTracks[0].setMuted(false)
        let mic = document.getElementById('mic-btn');
        mic.classList.remove('btn-danger')
        mic.classList.add('btn-success-dark')
    } else {
        await localTracks[0].setMuted(true)
        let mic = document.getElementById('mic-btn');
        mic.classList.remove('btn-success-dark')
        mic.classList.add('btn-danger')
    }
}

// create a meeting member on the backend for creditials
let createMeetingMember = async () => {
    let res = await fetch('/meetings/create_meeting_member/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body:JSON.stringify({
            'name': await sessionStorage.getItem('name'),
            'channel': await sessionStorage.getItem('channel'),
            'uid': await sessionStorage.getItem('uid')
        })
    })
    let member = await res.json()
    return member
}

// delete a meeting member on the backend
let deleteMeetingMember = async () => {
    let res = await fetch('/meetings/delete_meeting_member/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body:JSON.stringify({
            'name': await sessionStorage.getItem('name'),
            'channel': await sessionStorage.getItem('channel'),
            'uid': await sessionStorage.getItem('uid')
        })
    })
    let member = await res.json()
    // sessionStorage.clear()
}

// get meeting member creditials from backend
let getMeetingMember = async (user) => {
    const CHANNEL = await sessionStorage.getItem('channel')
    let res = await fetch(`/meetings/get_meeting_member/?uid=${user.uid}&channel=${CHANNEL}`)
    let data = await res.json()

    return data
}

// Share Screen
let shareScreen = async (user) => {
    let res = await fetch(`${window.location.origin}/meetings/get_screen_token/?channel=${channel}`);
    let data = await res.json()

    const CHANNEL = await data.channel
    const TOKEN = await data.token
    const UID = await data.uid

    var screenClient = AgoraRTC.createClient({mode: 'rtc', codec: 'vp8'});

    await screenClient.join(APP_ID, CHANNEL, TOKEN, UID)

    await AgoraRTC.createScreenVideoTrack({
    // Set the encoder configurations. For details, see the API description.
        encoderConfig: "1080p_1",
        // Set the video transmission optimization mode as prioritizing video quality.
        optimizationMode: "detail",
        withAudio: 'disabled'
    }).then(localScreenTrack => {
        console.log(localScreenTrack)
        // client.subscribe(user, localScreenTrack)
        screenClient.publish(localScreenTrack)
    });

}
// window.setInterval(async () => {
//     console.log('Keeping track of the meeting duration')
// }, 5000);

// Initial the local user joining the stream
joinAndDisplayLocalStream()
window.addEventListener('beforeunload', deleteMeetingMember)
window.addEventListener('onbeforeunload', deleteMeetingMember)
window.addEventListener('onhashchange', deleteMeetingMember)
window.onhashchange = deleteMeetingMember()
window.onbeforeunload = deleteMeetingMember()

// event listeners
document.getElementById('leave-btn').addEventListener('click', leaveAndRemoveLocalStream)
document.getElementById('camera-btn').addEventListener('click', toggleCamera)
document.getElementById('mic-btn').addEventListener('click', toggleMicrophone)
if (document.getElementById('cast-btn')) {
    document.getElementById('cast-btn').addEventListener('click', shareScreen)
}
