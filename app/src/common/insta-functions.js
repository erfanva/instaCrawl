
const BASE_URL = 'https://www.instagram.com/'

function cleanPostsdata(posts) {
    let data = []
  
    posts.forEach(post => {
      post = post.node
      const id = post.id
      const owner = post.owner.username
      const is_video = post.is_video
      const comments_count = (post.edge_media_to_comment && post.edge_media_to_comment.count) || 0
      const likes_count = (post.edge_liked_by || post.edge_media_preview_like).count
      const shortcode = post.shortcode
      const date = post.taken_at_timestamp
      const preview_display_url = post.display_url
      data.push({
        id: id,
        owner: owner,
        is_video: is_video,
        comments_count: comments_count,
        likes_count: likes_count,
        url: BASE_URL + 'p/' + shortcode,
        preview_display_url: preview_display_url,
        date: date
      })
    });
    return data
  }
  
  function selectPostsWithDate(posts, date_range) {
    let data = []
    posts.forEach(post => {
      if ((!date_range.from || post.date >= date_range.from) &&
        (!date_range.to || post.date <= date_range.to))
        data.push(post)
    });
    return data
  }
  
  function getPage(url) {
    const ses = session.fromPartition('persist:my-session-name')
    const request = net.request({
      method: 'GET',
      url: url,
      session: ses
    })
    return new Promise(function (resolve, reject) {
      request.on('response', (response) => {
        let data = ""
        response.on('data', (chunk) => {
          data += chunk
        })
        response.on('end', () => {
          resolve(data)
        })
      })
      request.end()
    })
  }
  function parsePostPage(pageText) {
    let res = pageText.split("__additionalDataLoaded")[2]
    if (res) {
      res = res.split('"graphql":')[1]
      res = `{"graphql":` + res
      res = res.split(");</script>")[0]
      res = JSON.parse(res)
    } else {
      res = pageText.split("window._sharedData = ")[1]
      res = res.split(";")[0]
      res = JSON.parse(res)
      res = res.entry_data.PostPage[0]
    }
    res = res.graphql.shortcode_media
  
    const media_sources = res.edge_sidecar_to_children && res.edge_sidecar_to_children.edges
    const display_url = res.is_video ? res.video_url : res.display_url
    let data = []
    if (media_sources) {
      media_sources.forEach(post => {
        post = post.node
        data.push(post.is_video ? post.video_url : post.display_url)
      });
    }
    return (data.length > 0 && data) || [display_url]
  }

  module.exports = {
    BASE_URL: BASE_URL,
    cleanPostsdata: cleanPostsdata,
    selectPostsWithDate: selectPostsWithDate,
    getPage: getPage,
    parsePostPage: parsePostPage
  }