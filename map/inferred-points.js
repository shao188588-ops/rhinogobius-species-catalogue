// Supplemental reference points derived from the type-locality wording.
// Explicit named rivers, settlements and protected areas are classified as
// named localities. Only genuinely vague/ambiguous records are inferred.
(() => {
  const inferred = {
    "Rhinogobius amoniceps": [27.058, 107.475, "县域河流级推定", "贵州瓮安县朱家山保护区、瓮安河流域"],
    "Rhinogobius baborinisanensis": [24.56, 120.82, "县域流域级推定", "台湾苗栗县大安溪水系"],
    "Rhinogobius changjiangensis": [19.05, 109.65, "流域级推定", "海南昌化江上游山溪"],
    "Rhinogobius cheni": [29.74, 116.22, "历史地名级推定", "江西湖口一带（原文 Hokou）"],
    "Rhinogobius chiengmaiensis": [18.7883, 98.9859, "城市级推定", "泰国北部清迈"],
    "Rhinogobius chongkangensis": [24.4, 120.71, "县域河流级推定", "台湾苗栗县东河、后龙溪／中港溪一带"],
    "Rhinogobius davidi": [29.2, 119.0, "区域级推定", "原始记录仅写中国西浙江"],
    "Rhinogobius delicatus": [23.32, 121.32, "河流级推定", "台湾花莲秀姑峦溪（Shokulwan River）"],
    "Rhinogobius dongfongensis": [27.05, 118.32, "乡镇流域级推定", "福建建瓯东峰镇、闽江支流"],
    "Rhinogobius duospilus": [22.43, 114.15, "区域溪流级推定", "香港新界丘陵溪流"],
    "Rhinogobius epikalymma": [21.85, 107.97, "乡镇河流级推定", "广西防城港华石镇、防城江支流"],
    "Rhinogobius fasciatus": [21.85, 107.97, "乡镇河流级推定", "广西防城港华石镇、防城江支流"],
    "Rhinogobius filamentosus": [25.62, 110.67, "乡镇级推定", "广西桂林兴安县金石一带"],
    "Rhinogobius fluviatilis": [34.81535, 134.68548, "城市级推定", "日本兵库县姬路"],
    "Rhinogobius formosanus": [24.80663, 120.96868, "历史城市级推定", "台湾新竹（原文 Shinchiku）"],
    "Rhinogobius gladius": [24.35, 106.56, "县域河流级推定", "广西百色凌云县泗城河／红水河水系"],
    "Rhinogobius henryi": [23.5, 113.5, "历史区域级推定", "广东 Lung-Nga Mountain、Mui-yen 历史地名范围"],
    "Rhinogobius imfasciocaudatus": [23.13, 104.7, "县域河流级推定", "云南麻栗坡猛硐河—盘龙河水系"],
    "Rhinogobius jangshiensis": [24.1, 117.61, "县域流域级推定", "福建漳浦县石榴镇、Jangshi 水系"],
    "Rhinogobius jingae": [18.77, 109.52, "市域河流级推定", "海南五指山南圣河、昌化江水系"],
    "Rhinogobius juno": [23.93, 108.1, "县域河流级推定", "广西河池都安县大兴河—红水河水系"],
    "Rhinogobius koreensis": [37.5, 127.5, "半岛级推定", "原始模式产地仅记为朝鲜半岛"],
    "Rhinogobius kurodai": [35.6762, 139.6503, "城市级推定", "日本东京黑田侯爵花园内淡水池"],
    "Rhinogobius leavelli": [23.48, 111.28, "城市周边溪流级推定", "广西梧州周边丘陵溪流"],
    "Rhinogobius lianchengensis": [25.71, 116.75, "县域流域级推定", "福建连城县 Shen-Shiu-Tang、闽江水系"],
    "Rhinogobius lingjiangensis": [25.27, 110.29, "城市河流级推定", "广西桂林西江小山溪"],
    "Rhinogobius lingtongyanensis": [23.93, 117.15, "山地乡镇级推定", "福建诏安／平和灵通岩附近东溪水系"],
    "Rhinogobius linshuiensis": [18.64, 109.7, "县域河流级推定", "海南保亭东南、陵水河一带"],
    "Rhinogobius liui": [29.59, 106.21, "乡镇河流级推定", "重庆璧山区七塘、璧北河—嘉陵江水系"],
    "Rhinogobius longyanensis": [25.08, 117.02, "城市支流级推定", "福建龙岩东肖、九龙江支流"],
    "Rhinogobius lungwoensis": [24.1, 115.26, "县域流域级推定", "广东龙川县附近、韩江水系西侧支流"],
    "Rhinogobius macromaculatus": [23.22, 120.26, "县域流域级推定", "台湾台南县曾文溪小支流"],
    "Rhinogobius maculafasciatus": [22.65, 120.45, "河流级推定", "台湾屏东县高屏溪水系 Joko River"],
    "Rhinogobius magnificus": [23.39, 105.83, "县域河流级推定", "广西百色那坡县 Gam River—红河水系"],
    "Rhinogobius margaritatus": [22.17, 111.79, "县域河流级推定", "广东阳春市漠阳江支流"],
    "Rhinogobius maxillivirgatus": [29.85, 117.72, "县域支流级推定", "安徽黄山祁门县长江支流"],
    "Rhinogobius mekongianus": [20.4, 100.25, "村落级推定", "老挝西北部 Ban Nam Khueng（约 20°24′N, 100°15′E）"],
    "Rhinogobius nagoyae": [35.1851, 136.8998, "城市级推定", "日本名古屋"],
    "Rhinogobius nandujiangensis": [19.6, 110.2, "流域级推定", "海南南渡江小山溪"],
    "Rhinogobius nantaiensis": [22.77, 120.63, "河流级推定", "台湾屏东县隘寮溪—高屏溪水系"],
    "Rhinogobius niger": [29.05, 120.45, "县域河流级推定", "浙江磐安县永安溪—灵江水系"],
    "Rhinogobius occidentalis": [25.02, 98.49, "县域河流级推定", "云南腾冲龙川江—伊洛瓦底江水系"],
    "Rhinogobius parvus": [22.34, 106.85, "城市河流级推定", "广西崇左龙州左江水系"],
    "Rhinogobius philippinus": [14.73, 121.35, "区域河流级推定", "菲律宾吕宋岛 Rizal 的 Santa Ines／Irid River 一带"],
    "Rhinogobius phuongae": [22.12, 103.77, "乡镇河流级推定", "越南 Lai Chau、Tan Uyen 的 Nam Can—Nam Mu River"],
    "Rhinogobius pulcher": [27.06, 110.57, "乡镇河流级推定", "湖南邵阳洞口县山门镇、黄江水系"],
    "Rhinogobius qilin": [25.6, 103.82, "县域河流级推定", "云南曲靖沾益县南盘江水系"],
    "Rhinogobius retigena": [24.35, 106.56, "县域河流级推定", "广西百色凌云县红水河水系"],
    "Rhinogobius rubrolineatus": [25.71, 116.75, "县域流域级推定", "福建连城县 Minjiang basin 历史地名 Wen-chuan-shi"],
    "Rhinogobius sagittus": [23.96, 117.34, "县域流域级推定", "福建漳州云霄一带 Nan-shi、闽江水系旧地名"],
    "Rhinogobius sangenloensis": [18.88, 110.24, "水库流域级推定", "海南牛路岭水库、万泉河水系小支流"],
    "Rhinogobius sexistriatus": [24.74, 118.15, "乡镇流域级推定", "福建同安溪、九龙江水系"],
    "Rhinogobius shennongensis": [31.74, 110.68, "山地区域级推定", "湖北神农架阳日湾、汉江上游"],
    "Rhinogobius sowerbyi": [40.12, 124.39, "河流区域级推定", "辽宁—吉林鸭绿江流域"],
    "Rhinogobius szechuanensis": [30.65, 104.07, "省域级推定", "原始模式产地仅记为四川"],
    "Rhinogobius wangchuangensis": [19.0, 110.3, "流域级推定", "海南 Wangchuang River 小山溪；旧拼写无法进一步落实"],
    "Rhinogobius wangi": [23.66, 116.62, "流域级推定", "广东东部韩江水系小支流；原文县名拼写不明确"],
    "Rhinogobius wui": [24.13, 110.18, "县域村落级推定", "广西金秀瑶族自治县 Meichuntum village／瑶山溪流"],
    "Rhinogobius xianshuiensis": [25.57, 118.7, "县域溪流级推定", "福建仙游县城北约 25 km 的仙水溪无名支流"],
    "Rhinogobius yaoshanensis": [24.13, 110.18, "县域级推定", "广西金秀（瑶山）"],
    "Rhinogobius zhuquella": [21.85, 107.97, "乡镇河流级推定", "广西防城港华石镇、防城江支流"]
  };

  const inferredOnly = new Set([
    "Rhinogobius cheni",
    "Rhinogobius davidi",
    "Rhinogobius duospilus",
    "Rhinogobius henryi",
    "Rhinogobius koreensis",
    "Rhinogobius nandujiangensis",
    "Rhinogobius sowerbyi",
    "Rhinogobius szechuanensis",
    "Rhinogobius wangchuangensis",
    "Rhinogobius wangi"
  ]);

  const points = window.RHINOGOBIUS_GEOREFERENCED_POINTS || {};
  for (const [scientificName, [latitude, longitude, accuracy, basis]] of Object.entries(inferred)) {
    const isInferred = inferredOnly.has(scientificName);
    points[scientificName] = {
      latitude,
      longitude,
      coordinateType: isInferred ? "inferred" : "named_locality",
      locationAccuracy: isInferred ? accuracy : accuracy.replace(/推定$/, "定位"),
      georeferenceNote: isInferred
        ? `根据范围模糊或旧地名尚未落实的模式产地文字“${basis}”推定代表点，仅用于概略展示；不是采集经纬度。`
        : `依据模式产地中明确的河流、村镇或保护区“${basis}”设置地名代表点；不是标本标签或原始描述提供的采集经纬度。`
    };
  }
  window.RHINOGOBIUS_GEOREFERENCED_POINTS = points;
})();
