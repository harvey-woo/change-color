import { GeometryBuffer } from '../mesh/GeometryBuffer';
import { Material } from '../material/Material';

/**
 * 可被实时渲染器用来渲染的对象
 */
class RenderableUnit {
	geometryBuffer: GeometryBuffer | null = new GeometryBuffer();
	material = new Material();
	visible = true;

	constructor() { this.visible = true; }
	initialize(): void {
		console.log('this.visible: ', this.visible);
	}
	buildGpuRes(gl: any | null): void {
		// 构建GPU端几何数据
		this.geometryBuffer?.buildGpuRes(gl);
		this.material.buildGpuRes(gl);
	}

	draw(gl: any | null): void {
		if (this.visible) {
			const gb = this.geometryBuffer;

			if (this.material && gb) {
				this.material.use(gl);
				gb.use(gl);

				gl.drawElements(gl.TRIANGLES, gb.vtxCount, gl.UNSIGNED_SHORT, gb.vtxOffset);
			}
		}
	}
	destroy(force = true): void {
		const gb = this.geometryBuffer;
		if (gb) {
			if (force) {
				gb.destroy();
			}
			this.geometryBuffer = null;
		}
		if (this.material) {
			if (force) {
				this.material.destroy();
			}
		}
	}
}

export { RenderableUnit };
