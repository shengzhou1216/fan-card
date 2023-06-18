const filter = {
    url: [
        {
            urlMatches: "https://live.bilibili.com/[0-9]+",
        },
    ],
};

async function getFromCookie(name) {
    const cookie = await chrome.cookies.get({
        url: "https://live.bilibili.com",
        name: name,
    });
    return cookie.value;
}

chrome.webNavigation.onDOMContentLoaded.addListener(async (details) => {
    // get uid
    const uid = await getFromCookie("DedeUserID");
    if (!uid) {
        console.warn("uid not found");
        return;
    }

    // get room id
    const url = details.url;
    const roomId = url.match(/https:\/\/live.bilibili.com\/(\d+)/)[1];
    if (!roomId) {
        console.error("roomId not found");
        return;
    }

    // 获取所有的粉丝勋章
    //  target_id 是 UID
    const mdealWallUrl =
        "https://api.live.bilibili.com/xlive/web-ucenter/user/MedalWall?target_id=" +
        uid;
    const medalWallRes = await fetch(mdealWallUrl, {
        method: "GET",
    });
    if (!medalWallRes.ok) {
        console.error("Get MedalWall failed: ", medalWallRes);
        return;
    }
    const r = await medalWallRes.json();
    if (r.code !== 0) {
        console.error("Get MedalWall failed: ", r);
        return;
    }
    const medals = r.data.list;

    // 获取主播的UID
    // https://api.live.bilibili.com/xlive/web-room/v2/index/getRoomPlayInfo?room_id=${roomId}&protocol=0,1&format=0,1,2&codec=0,1&qn=0&platform=web&ptype=8&dolby=5&panorama=1
    const roomInfoUrl = `https://api.live.bilibili.com/xlive/web-room/v2/index/getRoomPlayInfo?room_id=${roomId}&protocol=0,1&format=0,1,2&codec=0,1&qn=0&platform=web&ptype=8&dolby=5&panorama=1`;
    const roomInfoRes = await fetch(roomInfoUrl, {
        method: "GET",
    });
    if (!roomInfoRes.ok) {
        console.error("Get roomInfo failed: ", roomInfoRes);
        return;
    }
    const roomInfo = await roomInfoRes.json();
    if (roomInfo.code !== 0) {
        console.error("Get roomInfo failed: ", roomInfo);
        return;
    }
    const streamerUid = roomInfo.data.uid;

    // 切换牌子
    // 佩戴粉丝勋章:
    // post: https://api.live.bilibili.com/xlive/app-ucenter/v1/fansMedal/wear
    // form:
    //      medal_id: 
    //      csrf_token: 
    //      csrf: 
    //      visit_id: 
    // get csrf_token from cookie
    const csrfToken = await getFromCookie("bili_jct");
    const wearMedalUrl = "https://api.live.bilibili.com/xlive/app-ucenter/v1/fansMedal/wear";
    const medal = medals.find((item) => {
        return item.medal_info.target_id == streamerUid;
    });
    if (!medal) {
        console.error("😭 medal not found");
        return;
    }
    const medalId = medal.medal_info.medal_id;
    const wearMedalRes = await fetch(wearMedalUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `medal_id=${medalId}&csrf_token=${csrfToken}&csrf=${csrfToken}`,
    });
    if (!wearMedalRes.ok) {
        console.error("Wear medal failed: ", wearMedalRes);
        return;
    }
    const wearMedal = await wearMedalRes.json();
    if (wearMedal.code !== 0) {
        console.error("Wear medal failed: ", wearMedal);
        return;
    }
    console.log("wearMedal :>> ", wearMedal);
}, filter);
