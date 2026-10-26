// Taken from @sindresorhus/transliterate, MIT License, Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (https://sindresorhus.com)
// Lowercased, and without what removing diacritics does by itself.
const data = [
    "ß=ss ä=ae ö=oe ü=ue æ=ae ə=a ð=d ø=o œ=oe þ=th đ=d \u0621=e \u0622=a \u0623=a \u0624=w \u0625=a \u0626=y",
    "\u0627=a \u0628=b \u0629=t \u062A=t \u062B=th \u062C=j \u062D=h \u062E=kh \u062F=d \u0630=dh \u0631=r \u0632=z",
    "\u0633=s \u0634=sh \u0635=s \u0636=d \u0637=t \u0638=z \u0639=e \u063A=gh \u0640=_ \u0641=f \u0642=q \u0643=k",
    "\u0644=l \u0645=m \u0646=n \u0647=h \u0648=w \u0649=a \u064A=y \u064E\u200E=a \u064F=u \u0650\u200E=i \u0660=0",
    "\u0661=1 \u0662=2 \u0663=3 \u0664=4 \u0665=5 \u0666=6 \u0667=7 \u0668=8 \u0669=9 \u0686=ch \u06A9=k \u06AF=g",
    "\u067E=p \u0698=zh \u06CC=y \u06F0=0 \u06F1=1 \u06F2=2 \u06F3=3 \u06F4=4 \u06F5=5 \u06F6=6 \u06F7=7 \u06F8=8",
    "\u06F9=9 \u067C=p \u0681=z \u0685=c \u0689=d \uFEAB=d \uFEAD=r \u0693=r \uFEAF=z \u0696=g \u069A=x \u06AB=g",
    "\u06BC=n \u06C0=e \u06D0=e \u06CD=ai \u0679=t \u0688=d \u0691=r \u06BA=n \u06C1=h \u06BE=h \u06D2=e а=a б=b в=v",
    "г=g д=d ъе=ye е=e ё=yo ж=zh з=z и=i ый=iy й=y к=k л=l м=m н=n о=o п=p р=r с=s т=t у=u ф=f х=kh ц=ts ч=ch ш=sh",
    "щ=sch ъ= ы=y ь= э=e ю=yu я=ya ı=i i\u0307=i ա=a բ=b գ=g դ=d ե=ye զ=z է=e ը=y թ=t ժ=zh ի=i լ=l խ=kh ծ=ts կ=k հ=h",
    "ձ=dz ղ=gh ճ=tch մ=m յ=y ն=n շ=sh ու=u ո=vo չ=ch պ=p ջ=j ռ=r ս=s վ=v տ=t ր=r ց=c փ=p ք=q օ=o ֆ=f և=yev ა=a ბ=b",
    "გ=g დ=d ე=e ვ=v ზ=z თ=t ი=i კ=k ლ=l მ=m ნ=n ო=o პ=p ჟ=zh რ=r ს=s ტ=t უ=u ფ=ph ქ=q ღ=gh ყ=k შ=sh ჩ=ch ც=ts ძ=dz",
    "წ=ts ჭ=tch ხ=kh ჯ=j ჰ=h \u0780=h \u0781=sh \u0782=n \u0783=r \u0784=b \u0785=lh \u0786=k \u0787=a \u0788=v",
    "\u0789=m \u078A=f \u078B=dh \u078C=th \u078D=l \u078E=g \u078F=gn \u0790=s \u0791=d \u0792=z \u0793=t \u0794=y",
    "\u0795=p \u0796=j \u0797=ch \u0798=tt \u0799=hh \u079A=kh \u079B=th \u079C=z \u079D=sh \u079E=s \u079F=d",
    "\u07A0=t \u07A1=z \u07A2=a \u07A3=gh \u07A4=q \u07A5=w \u07A6=a \u07A7=aa \u07A8=i \u07A9=ee \u07AA=u \u07AB=oo",
    "\u07AC=e \u07AD=ey \u07AE=o \u07AF=oa \u07B0= α=a β=v γ=g δ=d ε=e ζ=z η=i θ=th ι=i κ=k λ=l μ=m ν=n ξ=ks ο=o π=p",
    "ρ=r σ=s τ=t υ=y φ=f χ=x ψ=ps ω=o ά=a έ=e ί=i ό=o ύ=y ή=i ώ=o ς=s ϊ=i ΰ=y ϋ=y ΐ=i ќ=kj љ=lj њ=nj тс=ts ł=l є=ye",
    "і=i ї=yi ґ=g ĳ=ij ¢=c ¥=y \u07FF=b ৳=t ૱=bo ฿=b ₠=ce ₡=c ₢=cr ₣=f ₥=m ₦=n ₧=pt ₨=rs ₩=w ₫=s €=e ₭=k ₮=t ₯=dp",
    "₰=s ₱=p ₲=g ₳=a ₴=s ₵=c ₶=tt ₷=s ₸=t ₹=r ₺=l ₽=p ₿=b ﹩=$ ￠=c ￥=y ￦=w 𝐀=a 𝐁=b 𝐂=c 𝐃=d 𝐄=e 𝐅=f 𝐆=g 𝐇=h",
    "𝐈=i 𝐉=j 𝐊=k 𝐋=l 𝐌=m 𝐍=n 𝐎=o 𝐏=p 𝐐=q 𝐑=r 𝐒=s 𝐓=t 𝐔=u 𝐕=v 𝐖=w 𝐗=x 𝐘=y 𝐙=z 𝐚=a 𝐛=b 𝐜=c 𝐝=d",
    "𝐞=e 𝐟=f 𝐠=g 𝐡=h 𝐢=i 𝐣=j 𝐤=k 𝐥=l 𝐦=m 𝐧=n 𝐨=o 𝐩=p 𝐪=q 𝐫=r 𝐬=s 𝐭=t 𝐮=u 𝐯=v 𝐰=w 𝐱=x 𝐲=y 𝐳=z",
    "𝐴=a 𝐵=b 𝐶=c 𝐷=d 𝐸=e 𝐹=f 𝐺=g 𝐻=h 𝐼=i 𝐽=j 𝐾=k 𝐿=l 𝑀=m 𝑁=n 𝑂=o 𝑃=p 𝑄=q 𝑅=r 𝑆=s 𝑇=t 𝑈=u 𝑉=v",
    "𝑊=w 𝑋=x 𝑌=y 𝑍=z 𝑎=a 𝑏=b 𝑐=c 𝑑=d 𝑒=e 𝑓=f 𝑔=g 𝑖=i 𝑗=j 𝑘=k 𝑙=l 𝑚=m 𝑛=n 𝑜=o 𝑝=p 𝑞=q 𝑟=r 𝑠=s",
    "𝑡=t 𝑢=u 𝑣=v 𝑤=w 𝑥=x 𝑦=y 𝑧=z 𝑨=a 𝑩=b 𝑪=c 𝑫=d 𝑬=e 𝑭=f 𝑮=g 𝑯=h 𝑰=i 𝑱=j 𝑲=k 𝑳=l 𝑴=m 𝑵=n 𝑶=o",
    "𝑷=p 𝑸=q 𝑹=r 𝑺=s 𝑻=t 𝑼=u 𝑽=v 𝑾=w 𝑿=x 𝒀=y 𝒁=z 𝒂=a 𝒃=b 𝒄=c 𝒅=d 𝒆=e 𝒇=f 𝒈=g 𝒉=h 𝒊=i 𝒋=j 𝒌=k",
    "𝒍=l 𝒎=m 𝒏=n 𝒐=o 𝒑=p 𝒒=q 𝒓=r 𝒔=s 𝒕=t 𝒖=u 𝒗=v 𝒘=w 𝒙=x 𝒚=y 𝒛=z 𝒜=a 𝒞=c 𝒟=d 𝒢=g 𝒥=j 𝒦=k 𝒩=n",
    "𝒪=o 𝒫=p 𝒬=q 𝒮=s 𝒯=t 𝒰=u 𝒱=v 𝒲=w 𝒳=x 𝒴=y 𝒵=z 𝒶=a 𝒷=b 𝒸=c 𝒹=d 𝒻=f 𝒽=h 𝒾=i 𝒿=j 𝓀=k 𝓁=l 𝓂=m",
    "𝓃=n 𝓅=p 𝓆=q 𝓇=r 𝓈=s 𝓉=t 𝓊=u 𝓋=v 𝓌=w 𝓍=x 𝓎=y 𝓏=z 𝓐=a 𝓑=b 𝓒=c 𝓓=d 𝓔=e 𝓕=f 𝓖=g 𝓗=h 𝓘=i 𝓙=j",
    "𝓚=k 𝓛=l 𝓜=m 𝓝=n 𝓞=o 𝓟=p 𝓠=q 𝓡=r 𝓢=s 𝓣=t 𝓤=u 𝓥=v 𝓦=w 𝓧=x 𝓨=y 𝓩=z 𝓪=a 𝓫=b 𝓬=c 𝓭=d 𝓮=e 𝓯=f",
    "𝓰=g 𝓱=h 𝓲=i 𝓳=j 𝓴=k 𝓵=l 𝓶=m 𝓷=n 𝓸=o 𝓹=p 𝓺=q 𝓻=r 𝓼=s 𝓽=t 𝓾=u 𝓿=v 𝔀=w 𝔁=x 𝔂=y 𝔃=z 𝔄=a 𝔅=b",
    "𝔇=d 𝔈=e 𝔉=f 𝔊=g 𝔍=j 𝔎=k 𝔏=l 𝔐=m 𝔑=n 𝔒=o 𝔓=p 𝔔=q 𝔖=s 𝔗=t 𝔘=u 𝔙=v 𝔚=w 𝔛=x 𝔜=y 𝔞=a 𝔟=b 𝔠=c",
    "𝔡=d 𝔢=e 𝔣=f 𝔤=g 𝔥=h 𝔦=i 𝔧=j 𝔨=k 𝔩=l 𝔪=m 𝔫=n 𝔬=o 𝔭=p 𝔮=q 𝔯=r 𝔰=s 𝔱=t 𝔲=u 𝔳=v 𝔴=w 𝔵=x 𝔶=y",
    "𝔷=z 𝔸=a 𝔹=b 𝔻=d 𝔼=e 𝔽=f 𝔾=g 𝕀=i 𝕁=j 𝕂=k 𝕃=l 𝕄=m 𝕆=o 𝕊=s 𝕋=t 𝕌=u 𝕍=v 𝕎=w 𝕏=x 𝕐=y 𝕒=a 𝕓=b",
    "𝕔=c 𝕕=d 𝕖=e 𝕗=f 𝕘=g 𝕙=h 𝕚=i 𝕛=j 𝕜=k 𝕝=l 𝕞=m 𝕟=n 𝕠=o 𝕡=p 𝕢=q 𝕣=r 𝕤=s 𝕥=t 𝕦=u 𝕧=v 𝕨=w 𝕩=x",
    "𝕪=y 𝕫=z 𝕬=a 𝕭=b 𝕮=c 𝕯=d 𝕰=e 𝕱=f 𝕲=g 𝕳=h 𝕴=i 𝕵=j 𝕶=k 𝕷=l 𝕸=m 𝕹=n 𝕺=o 𝕻=p 𝕼=q 𝕽=r 𝕾=s 𝕿=t",
    "𝖀=u 𝖁=v 𝖂=w 𝖃=x 𝖄=y 𝖅=z 𝖆=a 𝖇=b 𝖈=c 𝖉=d 𝖊=e 𝖋=f 𝖌=g 𝖍=h 𝖎=i 𝖏=j 𝖐=k 𝖑=l 𝖒=m 𝖓=n 𝖔=o 𝖕=p",
    "𝖖=q 𝖗=r 𝖘=s 𝖙=t 𝖚=u 𝖛=v 𝖜=w 𝖝=x 𝖞=y 𝖟=z 𝖠=a 𝖡=b 𝖢=c 𝖣=d 𝖤=e 𝖥=f 𝖦=g 𝖧=h 𝖨=i 𝖩=j 𝖪=k 𝖫=l",
    "𝖬=m 𝖭=n 𝖮=o 𝖯=p 𝖰=q 𝖱=r 𝖲=s 𝖳=t 𝖴=u 𝖵=v 𝖶=w 𝖷=x 𝖸=y 𝖹=z 𝖺=a 𝖻=b 𝖼=c 𝖽=d 𝖾=e 𝖿=f 𝗀=g 𝗁=h",
    "𝗂=i 𝗃=j 𝗄=k 𝗅=l 𝗆=m 𝗇=n 𝗈=o 𝗉=p 𝗊=q 𝗋=r 𝗌=s 𝗍=t 𝗎=u 𝗏=v 𝗐=w 𝗑=x 𝗒=y 𝗓=z 𝗔=a 𝗕=b 𝗖=c 𝗗=d",
    "𝗘=e 𝗙=f 𝗚=g 𝗛=h 𝗜=i 𝗝=j 𝗞=k 𝗟=l 𝗠=m 𝗡=n 𝗢=o 𝗣=p 𝗤=q 𝗥=r 𝗦=s 𝗧=t 𝗨=u 𝗩=v 𝗪=w 𝗫=x 𝗬=y 𝗭=z",
    "𝗮=a 𝗯=b 𝗰=c 𝗱=d 𝗲=e 𝗳=f 𝗴=g 𝗵=h 𝗶=i 𝗷=j 𝗸=k 𝗹=l 𝗺=m 𝗻=n 𝗼=o 𝗽=p 𝗾=q 𝗿=r 𝘀=s 𝘁=t 𝘂=u 𝘃=v",
    "𝘄=w 𝘅=x 𝘆=y 𝘇=z 𝘈=a 𝘉=b 𝘊=c 𝘋=d 𝘌=e 𝘍=f 𝘎=g 𝘏=h 𝘐=i 𝘑=j 𝘒=k 𝘓=l 𝘔=m 𝘕=n 𝘖=o 𝘗=p 𝘘=q 𝘙=r",
    "𝘚=s 𝘛=t 𝘜=u 𝘝=v 𝘞=w 𝘟=x 𝘠=y 𝘡=z 𝘢=a 𝘣=b 𝘤=c 𝘥=d 𝘦=e 𝘧=f 𝘨=g 𝘩=h 𝘪=i 𝘫=j 𝘬=k 𝘭=l 𝘮=m 𝘯=n",
    "𝘰=o 𝘱=p 𝘲=q 𝘳=r 𝘴=s 𝘵=t 𝘶=u 𝘷=v 𝘸=w 𝘹=x 𝘺=y 𝘻=z 𝘼=a 𝘽=b 𝘾=c 𝘿=d 𝙀=e 𝙁=f 𝙂=g 𝙃=h 𝙄=i 𝙅=j",
    "𝙆=k 𝙇=l 𝙈=m 𝙉=n 𝙊=o 𝙋=p 𝙌=q 𝙍=r 𝙎=s 𝙏=t 𝙐=u 𝙑=v 𝙒=w 𝙓=x 𝙔=y 𝙕=z 𝙖=a 𝙗=b 𝙘=c 𝙙=d 𝙚=e 𝙛=f",
    "𝙜=g 𝙝=h 𝙞=i 𝙟=j 𝙠=k 𝙡=l 𝙢=m 𝙣=n 𝙤=o 𝙥=p 𝙦=q 𝙧=r 𝙨=s 𝙩=t 𝙪=u 𝙫=v 𝙬=w 𝙭=x 𝙮=y 𝙯=z 𝙰=a 𝙱=b",
    "𝙲=c 𝙳=d 𝙴=e 𝙵=f 𝙶=g 𝙷=h 𝙸=i 𝙹=j 𝙺=k 𝙻=l 𝙼=m 𝙽=n 𝙾=o 𝙿=p 𝚀=q 𝚁=r 𝚂=s 𝚃=t 𝚄=u 𝚅=v 𝚆=w 𝚇=x",
    "𝚈=y 𝚉=z 𝚊=a 𝚋=b 𝚌=c 𝚍=d 𝚎=e 𝚏=f 𝚐=g 𝚑=h 𝚒=i 𝚓=j 𝚔=k 𝚕=l 𝚖=m 𝚗=n 𝚘=o 𝚙=p 𝚚=q 𝚛=r 𝚜=s 𝚝=t",
    "𝚞=u 𝚟=v 𝚠=w 𝚡=x 𝚢=y 𝚣=z 𝚤=l 𝚥=j 𝛢=a 𝛣=b 𝛤=g 𝛥=d 𝛦=e 𝛧=z 𝛨=i 𝛩=th 𝛪=i 𝛫=k 𝛬=l 𝛭=m 𝛮=n 𝛯=ks",
    "𝛰=o 𝛱=p 𝛲=r 𝛳=th 𝛴=s 𝛵=t 𝛶=y 𝛷=f 𝛸=x 𝛹=ps 𝛺=o 𝛻=d 𝛼=a 𝛽=b 𝛾=g 𝛿=d 𝜀=e 𝜁=z 𝜂=i 𝜃=th 𝜄=i",
    "𝜅=k 𝜆=l 𝜇=m 𝜈=n 𝜉=ks 𝜊=o 𝜋=p 𝜌=r 𝜍=s 𝜎=s 𝜏=t 𝜐=y 𝜑=f 𝜒=x 𝜓=ps 𝜔=o 𝜕=d 𝜖=e 𝜗=th 𝜘=k 𝜙=f",
    "𝜚=r 𝜛=p 𝜜=a 𝜝=v 𝜞=g 𝜟=d 𝜠=e 𝜡=z 𝜢=i 𝜣=th 𝜤=i 𝜥=k 𝜦=l 𝜧=m 𝜨=n 𝜩=ks 𝜪=o 𝜫=p 𝜬=s 𝜭=th 𝜮=s",
    "𝜯=t 𝜰=y 𝜱=f 𝜲=x 𝜳=ps 𝜴=o 𝜵=d 𝜶=a 𝜷=v 𝜸=g 𝜹=d 𝜺=e 𝜻=z 𝜼=i 𝜽=th 𝜾=i 𝜿=k 𝝀=l 𝝁=m 𝝂=n 𝝃=ks",
    "𝝄=o 𝝅=p 𝝆=r 𝝇=s 𝝈=s 𝝉=t 𝝊=y 𝝋=f 𝝌=x 𝝍=ps 𝝎=o 𝝏=a 𝝐=e 𝝑=i 𝝒=k 𝝓=f 𝝔=r 𝝕=p 𝝖=a 𝝗=b 𝝘=g 𝝙=d",
    "𝝚=e 𝝛=z 𝝜=i 𝝝=th 𝝞=i 𝝟=k 𝝠=l 𝝡=m 𝝢=n 𝝣=ks 𝝤=o 𝝥=p 𝝦=r 𝝧=th 𝝨=s 𝝩=t 𝝪=y 𝝫=f 𝝬=x 𝝭=ps 𝝮=o",
    "𝝯=d 𝝰=a 𝝱=v 𝝲=g 𝝳=d 𝝴=e 𝝵=z 𝝶=i 𝝷=th 𝝸=i 𝝹=k 𝝺=l 𝝻=m 𝝼=n 𝝽=ks 𝝾=o 𝝿=p 𝞀=r 𝞁=s 𝞂=s 𝞃=t 𝞄=y",
    "𝞅=f 𝞆=x 𝞇=ps 𝞈=o 𝞉=a 𝞊=e 𝞋=i 𝞌=k 𝞍=f 𝞎=r 𝞏=p 𝞐=a 𝞑=v 𝞒=g 𝞓=d 𝞔=e 𝞕=z 𝞖=i 𝞗=th 𝞘=i 𝞙=k 𝞚=l",
    "𝞛=m 𝞜=n 𝞝=ks 𝞞=o 𝞟=p 𝞠=s 𝞡=th 𝞢=s 𝞣=t 𝞤=y 𝞥=f 𝞦=x 𝞧=ps 𝞨=o 𝞩=d 𝞪=av 𝞫=g 𝞬=d 𝞭=e 𝞮=z 𝞯=i",
    "𝞰=i 𝞱=th 𝞲=i 𝞳=k 𝞴=l 𝞵=m 𝞶=n 𝞷=ks 𝞸=o 𝞹=p 𝞺=r 𝞻=s 𝞼=s 𝞽=t 𝞾=y 𝞿=f 𝟀=x 𝟁=ps 𝟂=o 𝟃=a 𝟄=e",
    "𝟅=i 𝟆=k 𝟇=f 𝟈=r 𝟉=p 𝟊=f 𝟋=f ⒜=(a) ⒝=(b) ⒞=(c) ⒟=(d) ⒠=(e) ⒡=(f) ⒢=(g) ⒣=(h) ⒤=(i) ⒥=(j) ⒦=(k) ⒧=(l)",
    "⒨=(m) ⒩=(n) ⒪=(o) ⒫=(p) ⒬=(q) ⒭=(r) ⒮=(s) ⒯=(t) ⒰=(u) ⒱=(v) ⒲=(w) ⒳=(x) ⒴=(y) ⒵=(z) ⓐ=(a) ⓑ=(b) ⓒ=(c) ⓓ=(d)",
    "ⓔ=(e) ⓕ=(f) ⓖ=(g) ⓗ=(h) ⓘ=(i) ⓙ=(j) ⓚ=(k) ⓛ=(l) ⓝ=(n) ⓞ=(o) ⓟ=(p) ⓠ=(q) ⓡ=(r) ⓢ=(s) ⓣ=(t) ⓤ=(u) ⓥ=(v) ⓦ=(w)",
    "ⓧ=(x) ⓨ=(y) ⓩ=(z) ⓜ=(m) ħ=h 𝟎=0 𝟏=1 𝟐=2 𝟑=3 𝟒=4 𝟓=5 𝟔=6 𝟕=7 𝟖=8 𝟗=9 𝟘=0 𝟙=1 𝟚=2 𝟛=3 𝟜=4 𝟝=5",
    "𝟞=6 𝟟=7 𝟠=8 𝟡=9 𝟢=0 𝟣=1 𝟤=2 𝟥=3 𝟦=4 𝟧=5 𝟨=6 𝟩=7 𝟪=8 𝟫=9 𝟬=0 𝟭=1 𝟮=2 𝟯=3 𝟰=4 𝟱=5 𝟲=6 𝟳=7",
    "𝟴=8 𝟵=9 𝟶=0 𝟷=1 𝟸=2 𝟹=3 𝟺=4 𝟻=5 𝟼=6 𝟽=7 𝟾=8 𝟿=9 ①=1 ②=2 ③=3 ④=4 ⑤=5 ⑥=6 ⑦=7 ⑧=8 ⑨=9 ⑩=10 ⑪=11 ⑫=12",
    "⑬=13 ⑭=14 ⑮=15 ⑯=16 ⑰=17 ⑱=18 ⑲=19 ⑳=20 ⑴=1 ⑵=2 ⑶=3 ⑷=4 ⑸=5 ⑹=6 ⑺=7 ⑻=8 ⑼=9 ⑽=10 ⑾=11 ⑿=12 ⒀=13 ⒁=14 ⒂=15 ⒃=16",
    "⒄=17 ⒅=18 ⒆=19 ⒇=20 ⒈=1. ⒉=2. ⒊=3. ⒋=4. ⒌=5. ⒍=6. ⒎=7. ⒏=8. ⒐=9. ⒑=10. ⒒=11. ⒓=12. ⒔=13. ⒕=14. ⒖=15. ⒗=16.",
    "⒘=17. ⒙=18. ⒚=19. ⒛=20. ⓪=0 ⓫=11 ⓬=12 ⓭=13 ⓮=14 ⓯=15 ⓰=16 ⓱=17 ⓲=18 ⓳=19 ⓴=20 ⓵=1 ⓶=2 ⓷=3 ⓸=4 ⓹=5 ⓺=6 ⓻=7 ⓼=8",
    "⓽=9 ⓾=10 ⓿=0 🙰=& 🙱=& 🙲=& 🙳=& 🙴=& 🙵=& 🙶=\u0022 🙷=\u0022 🙸=\u0022 ‽=?! 🙹=?! 🙺=?! 🙻=?! 🙼=/ 🙽=\u005C",
    "🜇=ar 🜈=v 🜉=v 🜆=vr 🜅=vf 🜩=2 🜪=5 🝡=f 🝢=w 🝣=u 🝧=v 🝨=t 🝪=v 🝫=mb 🝬=vb 🝲=3b 🝳=3b 💯=100 🔙=back",
    "🔚=end 🔛=on! 🔜=soon 🔝=top 🔞=18 🔤=abc 🔠=abcd 🔡=abcd 🔢=1234 🔣=t&@% #\uFE0F\u20E3=# *\uFE0F\u20E3=*",
    "0\uFE0F\u20E3=0 1\uFE0F\u20E3=1 2\uFE0F\u20E3=2 3\uFE0F\u20E3=3 4\uFE0F\u20E3=4 5\uFE0F\u20E3=5 6\uFE0F\u20E3=6",
    "7\uFE0F\u20E3=7 8\uFE0F\u20E3=8 9\uFE0F\u20E3=9 🔟=10 🅰\uFE0F=a 🅱\uFE0F=b 🆎=ab 🆑=cl 🅾\uFE0F=o 🅿=p 🆘=sos",
    "🅲=c 🅳=d 🅴=e 🅵=f 🅶=g 🅷=h 🅸=i 🅹=j 🅺=k 🅻=l 🅼=m 🅽=n 🆀=q 🆁=r 🆂=s 🆃=t 🆄=u 🆅=v 🆆=w 🆇=x 🆈=y 🆉=z",
    "−=- ⁓=-",
]

let table: Map<string, string> | undefined

/**
 * What characters that are not Latin are written as in Latin, by the lowercase character, or the
 * two or three that belong together.
 */
export function transliterations(): Map<string, string> {
    if (table) return table
    table = new Map()
    for (const pair of data.join(" ").split(" ")) {
        const index = pair.lastIndexOf("=")
        table.set(pair.slice(0, index), pair.slice(index + 1))
    }
    return table
}
