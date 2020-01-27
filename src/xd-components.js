
// 设置控件类型
processors.set("component", async packData => {
    let defaults = {
        // 默认模板
        temp: false,
        // 加载组件样式
        link: false,
        // 与组件同域下的样式
        hostlink: "",
        // 组件初始化完毕时
        ready() { },
        // 依赖子模块
        use: []
    };

    // load方法
    const load = (...args) => main.load(main.toUrlObjs(args, packData.dir));

    let options = base.tempM.d;

    if (isFunction(options)) {
        options = options(load, {
            DIR: packData.dir,
            FILE: packData.path
        });
        if (options instanceof Promise) {
            options = await options;
        }
    }

    // 合并默认参数
    Object.assign(defaults, options);

    // 获取文件名
    let fileName = packData.path.match(/.+\/(.+)/)[1];
    fileName = fileName.replace(/\.js$/, "");

    // 添加子组件
    if (defaults.use && defaults.use.length) {
        await load(...defaults.use);
    }

    // 置换temp
    let temp = "";
    if (defaults.temp) {
        // 判断是否有换行
        if (/\n/.test(defaults.temp)) {
            // 拥有换行，是模板字符串
            temp = defaults.temp;
        } else {
            let path;
            if (defaults.temp === true) {
                path = await load(`./${fileName}.html -getPath`)
            } else {
                // path = defaults.temp;
                path = await load(`${defaults.temp} -getPath`);
            }
            temp = await fetch(path);
            temp = await temp.text();
        }

        // 添加link
        let linkPath = defaults.link;
        if (linkPath) {
            if (defaults.link === true) {
                linkPath = await load(`./${fileName}.css -getPath`);
            } else {
                linkPath = await load(`${defaults.link} -getPath`);
            }
            linkPath && (temp = `<link rel="stylesheet" href="${linkPath}">\n` + temp);
        }
    }

    defaults.temp = temp;

    // ready钩子
    if (defaults.hostlink) {
        let oldReady = defaults.ready;

        defaults.ready = async function (...args) {
            // 添加hostlink
            // 获取元素域上的主
            let root = this.ele.getRootNode();

            let hostlink = await load(defaults.hostlink + " -getPath");

            // 查找是否已经存在该link
            let targetLinkEle = root.querySelector(`link[href="${hostlink}"]`)

            if (!targetLinkEle) {
                let linkEle = $(`<link rel="stylesheet" href="${hostlink}">`);
                if (root === document) {
                    root.querySelector("head").appendChild(linkEle.ele);
                } else {
                    root.appendChild(linkEle.ele);
                }
            }

            // 执行ready方法
            oldReady.apply(this, args);
        }
    }

    // 注册节点
    $.register(defaults);

    // 设置模块载入完成
    packData.stat = 3;
});

// 添加新类型
drill.Component = (d, moduleId) => {
    base.tempM = {
        type: "component",
        d,
        moduleId
    };
}

// 添加新类型
glo.Component || (glo.Component = drill.Component);