function getMax(num: number[]): number {
	if (!num.length) throw new TypeError('num is required');
	let _max: number | undefined;
	for (let i = 0; i < num.length; i++) {
		const item = num[i];
		if (typeof _max !== 'number') {
			_max = item;
		} else if (_max < item) {
			_max = item;
		}
	}
	return _max!;
}

function getMin(num: number[]): number {
	if (!num.length) throw new TypeError('num is required');
	let _min: number | undefined;
	for (let i = 0; i < num.length; i++) {
		const item = num[i];
		if (typeof _min !== 'number') {
			_min = item;
		} else if (_min > item) {
			_min = item;
		}
	}
	return _min!;
}

function mean(num: number[]): number {
	if (!num.length) throw new TypeError('num is required');
	let total = 0;
	for (let i = 0; i < num.length; i++) {
		total += num[i];
	}
	return total / num.length;
}

function getMeanAndStd(num: number[]): {
	std: number,
	mean: number
} {
	const _mean = mean(num);
	let memo = 0;
	for (let i = 0; i < num.length; i++) {
		memo += (num[i] - _mean) ** 2;
	}
	return {
		std: Math.sqrt(memo / num.length),
		mean: _mean,
	};
}

export function calcChangeColorParams(imgData: Uint8ClampedArray | Uint8Array): any {
	const grays: number[] = [];
	for (let i = 0; i < imgData.length; i += 4) {
		const [r, g, b] = [imgData[i], imgData[i + 1], imgData[i + 2]];
		const gray = Math.round(r * 0.299 + g * 0.587 + b * 0.114);
		grays.push(gray);
	}
	const obj = getMeanAndStd(grays);
	const _max = getMax(grays);
	const _min = getMin(grays);
	return {
		mean: obj.mean,
		variance: obj.std,
		minValCurI: obj.mean - _min,
		maxValCurI: _max - obj.mean,
	};
}

export default calcChangeColorParams;
